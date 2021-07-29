CREATE user denouser WITH password 'absx34';

CREATE database creative_project; \connect creative_projects;

CREATE TABLE users( id SERIAL PRIMARY KEY, username varchar(50) not null UNIQUE, password char(60) not null, bio text not null, socials varchar(160)[] not null );

CREATE TABLE posts ( post_id SERIAL PRIMARY KEY, author_id integer not null,title varchar(160) not null, content text not null, published_at varchar(160) not null, CONSTRAINT fk_user FOREIGN KEY(author_id) REFERENCES users(id)); 



grant select,insert,update,delete on users to denouser;

grant select,insert,update,delete on posts to denouser;