import axios from "axios";
import { GET_STORE_V1_URL } from "./config";

// url = "https://www.ubereats.com/api/getStoreV1?localecode=gb"
// data = {
//     "storeUuid": "a13f9e1b-0fed-454f-a656-d1ad072ca8e0"
// }
// r = requests.post(url, headers=headers, json=data)
// r

/**
 * Gets the store
 */
export async function getStore(uuid: string) {
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
                "User-Agent": "Mozilla/5.0 (Android 4.4; Tablet; rv:41.0) Gecko/41.0 Firefox/41.0"
            }
        }
    )

    return res.data;

}