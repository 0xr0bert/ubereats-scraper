import axios from 'axios'
import Bottleneck from 'bottleneck';
import {Pool, PoolClient} from 'pg';
import format from 'pg-format';
import {GET_FEED_V1_URL, MAX_CONCURRENT, MIN_TIME} from './config';

// This really shouldn't be needed, seems like a hopefully temporary bug on UE's end.
// You need to install fiddler classic (windows only) and enable https decryption.
import proxy from "node-global-proxy";
proxy.setConfig({
    http: "http://localhost:8888",
    https: "http://localhost:8888",
  });
proxy.start();
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
  

export interface Location {
    id: string;
    longitude: number;
    latitude: number
}

const limiter = new Bottleneck({
    minTime: MIN_TIME,
    maxConcurrent: MAX_CONCURRENT
});
const getFeedW = limiter.wrap(getFeed);

export async function getFeed(location: Location, offset: number) {
    const data = {
        pageInfo: {
            offset: offset,
            pageSize: 80
        }
    };

    const loc = {
        latitude: location.latitude,
        longitude: location.longitude
    };

    const locStr = encodeURIComponent(JSON.stringify(loc));
    const cookieStr = `uev2.loc=${locStr}; ; jwt-session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7Il9fand0X3JwY19wcm90ZWN0aW9uX2V4cGlyZXNfYXRfbXMiOjE3MDIyMjQyODA2NzQsIl9fand0X3JwY19wcm90ZWN0aW9uX3V1aWQiOiJiZjJmODYzOS0zNGIzLTQwOWQtYWE4ZC0wODIxZmY2ZWRmYmIiLCJfX2p3dF9ycGNfcHJvdGVjdGlvbl9jcmVhdGVkX2F0X21zIjoxNzAyMTM3OTU4MzUzfSwiaWF0IjoxNzAyMTM3OTU4LCJleHAiOjE3MDIyMjQzNTh9.rux2cAYyvrn_sWR58ziXfpgALRmvrwASudUl4U9JMUA`;

    try {
        const res = await axios.post(
            GET_FEED_V1_URL,
            data,
            {
                headers: {
                    cookie: cookieStr,
                    "x-csrf-token": "x",
                    "content-type": "application/json",
                    "accept": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0"
                }
            })
        return res.data

    } catch (error: any) {
        if (error.response) {
            console.log(error.response.data)
            console.log(error.response.status)
            console.log(error.response.headers)
        } else if (error.request) {
            console.log(error.request)
        } else {
            console.log('Error', error.message)
        }
        console.log(error.config)
        return null
    }
}

export async function getFeeds(location: Location): Promise<Array<Data>> {
    let status = "success";
    let hasMore = true;
    let offset = 0;
    const datas: Array<Data> = [];

    while (status == "success" && hasMore) {
        const resp = await getFeedW(location, offset);
        if (resp != null) {
            status = resp.status;
            if (status == "success") {
                const data = resp.data as Data;
                hasMore = data.meta.hasMore;
                offset = data.meta.offset;
                datas.push(data);
            }
        }
    }

    return datas;
}

export async function processFeeds(datas: Array<Data>, id: string, client: PoolClient) {
    try {
        const uuids: Array<string> = datas.map(
            d => d.feedItems
        ).flat().filter(f => f.carousel !== undefined).map(
            f => f.carousel?.stores
        ).flat().map(
            s => s?.storeUuid
        ).filter(s => s !== undefined).map(
            s => s as string
        )

        uuids.push(
            ...datas.map(
                d => d.feedItems
            ).flat().filter(f => f.stores !== undefined).map(
                f => f.stores
            ).flat().map(
                s => s?.storeUuid
            ).filter(s => s !== undefined).map(
                s => s as string
            )
        )

        uuids.push(
            ...datas.map(
                d => d.feedItems
            ).flat().filter(f => f.store !== undefined).map(
                f => f.store?.storeUuid
            ).filter(s => s !== undefined).map(
                s => s as string
            )
        )

        const insertData = uuids.map(u => [id, u]);
        if (insertData.length) {
            await client.query(
                format('INSERT INTO locations_to_restaurants(location_id, restaurant_id) VALUES %L ON CONFLICT DO NOTHING', insertData)
            );
        }

        return client.query("UPDATE locations SET visited_time = $1 WHERE id = $2", [new Date(), id]);
    } finally {
        client.release();
    }
}

export async function getAndProcessFeed(location: Location, client: PoolClient) {
    const res = await getFeeds(location);
    return processFeeds(res, location.id, client);
}

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    port: 5432,
    password: "postgres",
    database: "ue"
});

(async () => {
    const client = await pool.connect();
    try {
        const res = await client.query(
            "SELECT id, longitude, latitude FROM locations WHERE visited_time IS NULL"
        );

        const promises = res.rows.map(
            async row => getAndProcessFeed(row, await pool.connect())
        );
        await Promise.all(promises);
    } finally {
        client.release();
    }
})();

// Below are the response interfaces

export interface Root {
    status: string
    data?: Data
}

export interface Data {
    diningModes: DiningMode[]
    sortAndFilters: SortAndFilter[]
    feedItems: FeedItem[]
    feedAffixes: FeedAffix[]
    meta: Meta
    currencyCode: string
    isInServiceArea: boolean
    title: string
}

export interface DiningMode {
    mode: string
    title: string
    isAvailable: boolean
    isSelected: boolean
}

export interface SortAndFilter {
    uuid: string
    type: string
    label: string
    maxPermitted: number
    minPermitted: number
    options: Option[]
    selected: boolean
}

export interface Option {
    uuid: string
    value: string
    isDefault: boolean
    label: string
    iconUrl?: string
    selected?: boolean
}

export interface FeedItem {
    uuid: string
    type: string
    carousel?: Carousel
    analyticsLabel: string
    title?: string
    items?: Item2[]
    header?: Header2
    carouselBackground?: CarouselBackground
    carouselHeader?: CarouselHeader
    stores?: Store2[]
    store?: Store3
}

export interface Carousel {
    stores: Store[]
    header: Header
}

export interface Store {
    storeUuid: string
    title: Title
    meta: Meum[]
    rating?: Rating
    actionUrl: string
    favorite: boolean
    image: Image
    signposts?: Signpost[]
    storyIconPayload: StoryIconPayload
    storeRewardTracker?: StoreRewardTracker
}

export interface Title {
    text: string
}

export interface Meum {
    text: string
    textFormat?: string
}

export interface Rating {
    text?: string
    accessibilityText?: string
    iconUrl?: string
}

export interface Image {
    items: Item[]
}

export interface Item {
    url: string
    width?: number
    height?: number
}

export interface Signpost {
    backgroundColor: BackgroundColor
    text: string
    textColor: TextColor
}

export interface BackgroundColor {
    color: string
}

export interface TextColor {
    color: string
}

export interface StoryIconPayload {
    isIconVisible: boolean
}

export interface StoreRewardTracker {
    title: Title2[]
    userPoints: UserPoints
    restaurantThreshold: RestaurantThreshold
    pointConversionType: string
    eaterRewardState: string
}

export interface Title2 {
    text: string
    textFormat: string
}

export interface UserPoints {
    high: number
    low: number
    unsigned: boolean
}

export interface RestaurantThreshold {
    high: number
    low: number
    unsigned: boolean
}

export interface Header {
    title: Title3
    subtitle?: Subtitle
    callToAction?: CallToAction
    endIcon?: string
}

export interface Title3 {
    text: string
}

export interface Subtitle {
    text: string
}

export interface CallToAction {
    text: string
    actionUrl: string
}

export interface Item2 {
    trackingCode: string
    pillOverlay?: PillOverlay
    actionUrl?: string
    image?: Image2
    categoryName?: string
    slug?: string
    imageUrl?: string
    iconUrl?: string
    backgroundColor?: string
    type?: string
}

export interface PillOverlay {
    text: string
}

export interface Image2 {
    items: Item3[]
}

export interface Item3 {
    url: string
}

export interface Header2 {
    title: Title4
    endIcon: string
}

export interface Title4 {
    text: string
}

export interface CarouselBackground {
    imageUrl: string
    callToAction: CallToAction2
}

export interface CallToAction2 {
    text: string
    actionUrl: string
}

export interface CarouselHeader {
    title: Title5
    subtitle: Subtitle2
}

export interface Title5 {
    text: string
}

export interface Subtitle2 {
    text: string
}

export interface Store2 {
    storeUuid: string
    title: Title6
    meta: Meum2[]
    meta2: Meta2[]
    rating?: Rating2
    actionUrl: string
    favorite: boolean
    image: Image3
    mapMarker: MapMarker
    removable: boolean
}

export interface Title6 {
    text: string
}

export interface Meum2 {
    text: string
}

export interface Meta2 {
    text: string
}

export interface Rating2 {
    text: string
    accessibilityText: string
}

export interface Image3 {
    items: Item4[]
}

export interface Item4 {
    url: string
    width: number
    height: number
}

export interface MapMarker {
    latitude: number
    longitude: number
    zIndex: number
    description: Description
    markerContent: MarkerContent
    secondaryMarkerContent?: SecondaryMarkerContent
}

export interface Description {
    title: string
    color: string
    backgroundColor: string
    selectedColor: string
    selectedBackgroundColor: string
}

export interface MarkerContent {
    color: string
    selectedColor: string
    backgroundColor: string
    selectedBackgroundColor: string
    text?: string
    size: string
    icon?: string
}

export interface SecondaryMarkerContent {
    color: string
    selectedColor: string
    backgroundColor: string
    selectedBackgroundColor: string
    text?: string
    icon?: string
}

export interface Store3 {
    storeUuid: string
    title: Title7
    meta: Meum3[]
    rating?: Rating3
    actionUrl: string
    favorite: boolean
    image: Image4
    signposts?: Signpost2[]
    storyIconPayload: StoryIconPayload2
}

export interface Title7 {
    text: string
}

export interface Meum3 {
    text: string
    textFormat?: string
}

export interface Rating3 {
    text: string
    accessibilityText: string
}

export interface Image4 {
    items: Item5[]
}

export interface Item5 {
    url: string
    width?: number
    height?: number
}

export interface Signpost2 {
    backgroundColor: BackgroundColor2
    text: string
    textColor: TextColor2
}

export interface BackgroundColor2 {
    color: string
}

export interface TextColor2 {
    color: string
}

export interface StoryIconPayload2 {
    isIconVisible: boolean
}

export interface FeedAffix {
    uuid: string
    type: string
    shortcuts?: Shortcut[]
    analyticsLabel?: string
    eaterMessage?: EaterMessage
}

export interface Shortcut {
    uuid: string
    imageUrl: string
    isExternal?: boolean
    webUrl: string
    horizontalPosition: number
    label: string
    analyticsLabel: string
}

export interface EaterMessage {
    uuid: string
    payload: Payload
    surface: string
    surfaceId: string
}

export interface Payload {
    cardCarousel: CardCarousel
    type: string
}

export interface CardCarousel {
    carouselItems: CarouselItem[]
    template: string
    shouldAutoScroll: boolean
}

export interface CarouselItem {
    card: Card
    type: string
}

export interface Card {
    uuid: string
    metadata: Metadata
    title: string
    subtitle: string
    cta: Cta
    backgroundColor?: BackgroundColor3
    trailingImage?: TrailingImage
    isBackgroundDark: boolean
    backgroundImage?: BackgroundImage
}

export interface Metadata {
    maxDisplayCount: number
    trackingID: string
}

export interface Cta {
    text: string
    action: Action
    trackingID: string
}

export interface Action {
    openDeeplink: OpenDeeplink
    type: string
}

export interface OpenDeeplink {
    url: string
}

export interface BackgroundColor3 {
    color: Color
    type: string
}

export interface Color {
    alpha: number
    color: string
}

export interface TrailingImage {
    url: string
}

export interface BackgroundImage {
    url: string
    overlayOpacity: number
}

export interface Meta {
    offset: number
    hasMore: boolean
}
