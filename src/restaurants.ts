import axios from "axios";
import { Pool, PoolClient } from "pg";
import { GET_STORE_V1_URL, MAX_CONCURRENT, MIN_TIME } from "./config";
import { v4 as uuidv4 } from 'uuid';
import format from "pg-format";
import Bottleneck from "bottleneck";


// This really shouldn't be needed, seems like a hopefully temporary bug on UE's end.
// You need to install fiddler classic (windows only) and enable https decryption.
import proxy from "node-global-proxy";
proxy.setConfig({
    http: "http://localhost:8888",
    https: "http://localhost:8888",
  });
proxy.start();
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
  


const limiter = new Bottleneck({
  minTime: MIN_TIME,
  maxConcurrent: MAX_CONCURRENT
});
const getStoreW = limiter.wrap(getStore)

/**
 * Gets the store
 */

const cookieStr = `jwt-session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7Il9fand0X3JwY19wcm90ZWN0aW9uX2V4cGlyZXNfYXRfbXMiOjE3MDI0Njg2NTA5NzQsIl9fand0X3JwY19wcm90ZWN0aW9uX3V1aWQiOiI1ZWVjYjc0Ny04ZThjLTQ1YTEtYWEzNi0yYTQ3MjhkZTU4ZTMiLCJfX2p3dF9ycGNfcHJvdGVjdGlvbl9jcmVhdGVkX2F0X21zIjoxNzAyMzgxNzY4NzMxfSwiaWF0IjoxNzAyMzgxNzY4LCJleHAiOjE3MDI0NjgxNjh9.HttFiJUxrGA7e1BoTRa8yUl_PZfRDt0TMlK3q1kP0uA`;
export async function getStore(uuid: string): Promise<Root> {
  const data = {
    "storeUuid": uuid,
  };

  const res = await axios.post(
    GET_STORE_V1_URL,
    data,
    {
      headers: {
        "x-csrf-token": "x",
        "content-type": "application/json",
        "accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Android 4.4; Tablet; rv:41.0) Gecko/41.0 Firefox/41.0",
        "cookie": cookieStr
      },
      timeout: 10000
    }
  )

  return res.data;
}

export async function writeStore(data: Data, client: PoolClient) {
  try {
    await client.query(
      `UPDATE restaurants SET
        visited_time = $1,
        title = $2,
        slug = $3,
        citySlug = $4,
        location__address = $5,
        location__street_address = $6,
        location__city = $7,
        location__country = $8,
        location__region = $9,
        location__latitude = $10,
        location__longitude = $11,
        location__geo__city = $12,
        location__geo__country = $13,
        location__geo__neighborhood = $14,
        location__geo__region = $15,
        location__location_type = $16,
        is_delivery_third_party = $17,
        is_delivery_over_the_top = $18,
        rating__rating_value = $19,
        rating__review_count = $20,
        sanitized_title = $21,
        city_id = $22,
        is_delivery_bandwagon = $23,
        menu_uuid = $24,
        menu_display_type = $25,
        has_multiple_menus = $26,
        parent_chain__uuid = $27,
        parent_chain__name = $28
        WHERE id = $29
      `,
      [
        new Date(),
        data.title,
        data.slug,
        data.citySlug,
        data.location?.address,
        data.location?.streetAddress,
        data.location?.city,
        data.location?.country,
        data.location?.region,
        data.location?.latitude,
        data.location?.longitude,
        data.location?.geo?.city,
        data.location?.geo?.country,
        data.location?.geo?.neighborhood,
        data.location?.geo?.region,
        data.location?.locationType,
        data.isDeliveryThirdParty,
        data.isDeliveryOverTheTop,
        data.rating?.ratingValue,
        data.rating?.reviewCount,
        data.sanitizedTitle,
        data.cityId,
        data.isDeliveryBandwagon,
        data.menuUUID,
        data.menuDisplayType,
        data.hasMultipleMenus,
        data.parentChain?.uuid,
        data.parentChain?.name,
        data.uuid
      ]
    )

    const hours = data.hours;

    if (hours !== undefined) {
      const promises = (hours as [Hours]).map(async h => {
        const uuid = uuidv4();
        await client.query(
          `INSERT INTO restaurant_to_hours(id, restaurant_id, day_range)
        VALUES ($1, $2, $3)
        `, [uuid, data.uuid, h.dayRange]
        );

        const sectionHours = h.sectionHours;

        if (sectionHours !== undefined) {
          const promises = (sectionHours as [SectionHours]).map(
            async s => {
              const uuid2 = uuidv4();
              return client.query(`
            INSERT INTO restaurant_hours_to_section_hours
              (id, restaurant_id, restaurant_to_hours_id, start_time, end_time, section_title)
              VALUES ($1, $2, $3, $4, $5, $6)
          `, [uuid2, data.uuid, uuid, s.startTime, s.endTime, s.sectionTitle]);
            }
          );
          await Promise.all(promises);
        }
      });

      await Promise.all(promises);
    }

    const categoryInsertData = data.categories?.map(c => [data.uuid, c]);

    if (categoryInsertData !== undefined && categoryInsertData?.length > 0) {
      await client.query(
        format(`INSERT INTO restaurant_to_categories(restaurant_id, category) VALUES %L ON CONFLICT DO NOTHING`,
          (categoryInsertData as [[string]])
        ));
    }

    if (data.supportedDiningModes !== undefined) {
      const modes = data.supportedDiningModes as [SupportedDiningMode];

      const insertData = modes.map(m => [uuidv4(), data.uuid, m.mode, m.title, m.isAvailable, m.isSelected]);

      await client.query(
        format(`INSERT INTO restaurant_to_supported_dining_modes(
            id, restaurant_id, mode, title, isAvailable, isSelected
          ) VALUES %L`, insertData)
      );
    }

    if (data.catalogSectionsMap !== undefined && data.catalogSectionsMap !== null) {
      const catalogSectionsMap = data.catalogSectionsMap as CatalogSectionsMap;

      for (const [_k, v] of Object.entries(catalogSectionsMap)) {
        for (const catalogSectionsMapData of v) {
          const payload = catalogSectionsMapData.payload?.standardItemsPayload;
          if (payload !== undefined) {
            const payload2 = payload as StandardItemsPayload;
            await client.query(
              "INSERT INTO menu_sections(id, restaurant_id, title) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
              [payload2.sectionUUID, data.uuid, payload2.title?.text]
            );

            const itemsInsertData = payload2.catalogItems?.map(item => [
              item.uuid,
              data.uuid,
              payload2.sectionUUID,
              item.title,
              item.itemDescription,
              item.price,
              item.displayType,
              item.isSoldOut,
              item.hasCustomizations,
              item.subsectionUuid,
              item.isAvailable,
              item.priceTagline.accessibilityText,
            ]);
            if (itemsInsertData !== undefined && itemsInsertData?.length > 0) {
              await client.query(format(
                `INSERT INTO menu_items(
                  id,
                  restaurant_id,
                  menu_section_id,
                  name,
                  description,
                  price,
                  display_type,
                  is_sold_out,
                  has_customizations,
                  subsection_uuid,
                  is_available,
                  price_tagline__accessibility_text
                ) VALUES %L ON CONFLICT DO NOTHING`, itemsInsertData
              ));
            }
          }
        }
      }
    }
  } finally {
    client.release();
  }
}

export async function getAndWriteStore(uuid: string, client: PoolClient) {
  try {
    const data = await getStoreW(uuid);
    if (data.status === "success" && data.data !== undefined) {
      console.log({
        response: data.status,
        uuid: uuid
      })
      await writeStore(data.data, client);
    } else {
      console.error({
        response: data,
        uuid: uuid
      });
      client.release();
    }
  } catch (e) {
    console.error({
      error: e,
      uuid: uuid
    })
    client.release()

  }
}

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  password: "postgres",
  database: "postgres",
  port: 5433
});

(async () => {
  const client = await pool.connect();
  try {
    const res = await client.query(
      "SELECT id FROM restaurants WHERE visited_time IS NULL"
    );

    const promises = res.rows.map(async row => getAndWriteStore(row.id, await pool.connect()));
    await Promise.all(promises);
  } finally {
    client.release();
  }
})();

// Below are the definitions

export interface Root {
  status: string,
  data?: Data,
}

export interface Data {
  title?: string,
  uuid: string,
  slug?: string,
  citySlug?: string,
  location?: Location,
  isDeliveryThirdParty?: boolean,
  isDeliveryOverTheTop?: boolean,
  rating?: Rating,
  hours?: [Hours],
  categories?: [string],
  modalityInfo?: ModalityInfo,
  sections?: [Section],
  sanitizedTitle?: string,
  cityId?: number,
  isDeliveryBandwagon?: boolean,
  cuisineList?: [string],
  supportedDiningModes?: [SupportedDiningMode],
  menuUUID?: string,
  menuDisplayType?: string,
  hasMultipleMenus?: boolean,
  parentChain?: ParentChain,
  catalogSectionsMap?: CatalogSectionsMap,
}

export interface Location {
  address?: string,
  streetAddress?: string,
  city?: string,
  country?: string,
  postalCode?: string,
  region?: string,
  latitude?: string,
  longitude?: string,
  geo?: Geo,
  locationType: string,
}

export interface Geo {
  city?: string,
  country?: string,
  neighborhood?: string,
  region?: string
}

export interface Rating {
  ratingValue?: number,
  reviewCount?: string,
}

export interface Hours {
  dayRange?: string,
  sectionHours?: [SectionHours],
}

export interface SectionHours {
  startTime?: number,
  endTime?: number,
  sectionTitle?: string,
}

export interface ModalityInfo {
  modalityOptions?: [ModalityOption]
}

export interface ModalityOption {
  title?: string,
  subtitle?: string,
  isDisabled?: true
}

export interface Section {
  title?: string,
  subtitle?: string,
  uuid?: string,
  isTop?: boolean,
  isOnSale?: boolean,
  subsectionUuids: [string],
}

export interface SupportedDiningMode {
  mode?: string,
  title?: string,
  isAvailable?: boolean,
  isSelected?: boolean
}

export interface ParentChain {
  uuid?: string,
  name?: string
}

export interface CatalogSectionsMap {
  [injavascriptdex: string]: [CatalogSectionsMapData],
}

export interface CatalogSectionsMapData {
  type?: string,
  catalogSectionUUID?: string,
  payload?: Payload
}

export interface Payload {
  standardItemsPayload?: StandardItemsPayload,
  type?: string,
}

export interface StandardItemsPayload {
  title?: Title,
  spanCount?: number,
  sectionUUID?: string,
  catalogItems?: [CatalogItem]
}

export interface Title {
  text?: string,
}

export interface CatalogItem {
  uuid?: string,
  imageUrl?: string,
  title?: string,
  itemDescription?: string,
  priceTagline: PriceTagline,
  price: number,
  spanCount: 1,
  displayType: string,
  isSoldOut: boolean,
  hasCustomizations: boolean,
  subsectionUuid: string,
  isAvailable: boolean
}

export interface PriceTagline {
  text: string,
  textFormat: string,
  accessibilityText: string
}