
export interface Location {
  lsoa11cd: string;
  longitude: number;
  latitude: number
}

export async function getRestaurants(location: Location, offset: number) {
}

export interface Root {
  status: string
  data: Data
}

export interface Data {
  countdowns: any[]
  diningModes: DiningMode[]
  sortAndFilters: SortAndFilter[]
  favorites: Favorites
  feedItems: FeedItem[]
  feedAffixes: FeedAffix[]
  storesMap: StoresMap
  meta: Meta
  currencyCode: string
  isInServiceArea: boolean
  title: string
  feedHeader: FeedHeader
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

export interface Favorites { }

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
  meta2: any
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
  title: any
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
  signposts: any[]
  mapMarker: MapMarker
  meta3: any
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
  meta2: any
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

export interface StoresMap { }

export interface Meta {
  offset: number
  hasMore: boolean
}

export interface FeedHeader { }
