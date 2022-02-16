create table if not exists locations (
    lsoa11cd varchar(10) primary key,
    lsoa11nm text not null,
    longitude double precision not null,
    latitude double precision not null,
    visited boolean not null
);