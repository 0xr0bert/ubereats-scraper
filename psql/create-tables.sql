create table if not exists locations (
  id varchar(10) primary key,
  name text not null,
  region text not null,
  latitude double precision not null,
  longitude double precision not null,
  visited_time timestamptz
);
create table if not exists locations_to_restaurants(
  location_id varchar(10) not null,
  restaurant_id uuid not null,
  primary key(location_id, restaurant_id)
);
create table if not exists restaurants(
  id uuid not null primary key,
  visited_time timestamptz,
  title text,
  slug text,
  citySlug text,
  location__address text,
  location__street_address text,
  location__city text,
  location__country text,
  location__postal_code text,
  location__region text,
  location__latitude text,
  location__longitude text,
  location__geo__city text,
  location__geo__country text,
  location__geo__neighborhood text,
  location__geo__region text,
  location__location_type text,
  is_delivery_third_party boolean,
  is_delivery_over_the_top boolean,
  rating__rating_value double precision,
  rating__review_count text,
  sanitized_title text,
  city_id integer,
  is_delivery_bandwagon boolean,
  menu_uuid uuid,
  menu_display_type text,
  has_multiple_menus boolean,
  parent_chain__uuid uuid,
  parent_chain__name text
);
create table if not exists restaurant_to_hours(
  id uuid primary key,
  restaurant_id uuid not null,
  day_range text,
  constraint fk_restaurant_id foreign key(restaurant_id) references restaurants(id)
);
create table if not exists restaurant_hours_to_section_hours(
  id uuid primary key,
  restaurant_id uuid not null,
  restaurant_to_hours_id uuid not null,
  start_time integer,
  end_time integer,
  section_title text,
  constraint fk_restaurant_id foreign key(restaurant_id) references restaurants(id),
  constraint fk_restaurant_to_hours_id foreign key(restaurant_to_hours_id) references restaurant_to_hours(id)
);
create table if not exists restaurant_to_categories(
  restaurant_id uuid not null,
  category text not null,
  primary key(restaurant_id, category),
  constraint fk_restaurant_id foreign key(restaurant_id) references restaurants(id)
);
create table if not exists restaurant_to_supported_dining_modes(
  id uuid primary key,
  restaurant_id uuid not null,
  mode text,
  title text,
  isAvailable boolean,
  isSelected boolean,
  constraint fk_restaurant_id foreign key(restaurant_id) references restaurants(id)
);
create table if not exists menu_sections(
  id uuid primary key,
  restaurant_id uuid not null,
  title text,
  subtitle text,
  is_top boolean,
  is_on_sale boolean,
  constraint fk_restaurant_id foreign key(restaurant_id) references restaurants(id)
);
create table if not exists menu_subsections_to_sections(
  section_id uuid not null,
  subsection_id uuid not null,
  restaurant_id uuid not null,
  primary key(section_id, subsection_Id, restaurant_id)
);
create table if not exists menu_items(
  id uuid primary key,
  restaurant_id uuid not null,
  menu_section_id uuid not null,
  name text,
  description text,
  price int,
  price_currency varchar(3),
  constraint fk_restaurant_id foreign key(restaurant_id) references restaurants(id),
  constraint fk_menu_section_id foreign key(menu_section_id) references menu_sections(id)
);