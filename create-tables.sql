create table customers(
    postcode varchar(8) primary key,
    latitude real,
    longitude real
);

create table restaurants(
    id uuid primary key,
    name text,
    url text,
    address__street text,
    address__locality text,
    address__region text,
    address__country text,
    address__postcode text,
    latitude real,
    longitude real,
    telephone text,
    rating_value real,
    review_count text,
    price_range text,
    delivery_available boolean,
    collection_available boolean,
    is_delivery_bandwagon boolean,
    is_delivery_over_the_top boolean,
    is_delivery_third_party boolean
);

create table restaurant_opening_hours(
    id serial primary key,
    day text,
    opening_time time,
    closing_time time,
    restaurant_id uuid
);

create table menu_categories(
    id uuid primary key,
    name text,
    restaurant_id uuid
);

create table items_to_menu_categories(
    item_id uuid,
    restaurant_id uuid,
    menu_category_id uuid,
    primary key (item_id, restaurant_id, menu_category_id)
);

create table items(
    id uuid primary key,
    restaurant_id uuid,
    name text,
    price money,
    description text,
    image_url text
);

create table customers_to_restaurants(
    customer_id varchar(8),
    restaurant_id uuid,
    primary key (customer_id, restaurant_id)
);

create table cuisines_to_restaurants(
    cuisine_id text,
    restaurant_id uuid,
    primary key (cuisine_id, restaurant_id)
);

create table cuisines(
    name text primary key,
);