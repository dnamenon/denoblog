import { Client , Pool} from "https://deno.land/x/postgres/mod.ts";
import {Post} from "./post.ts";

const pool = new Pool({
  user: "denouser",
  database: "creative_project",
  hostname: "localhost",
  password: 'absx34',
  port: 5432
},20,true);



export const dbregister = async (username: string, hashed_password: string) => {
  const client = await pool.connect();
  const result = await  client.queryArray(
    "INSERT INTO users (username, password, bio, socials, VALUES ($1, $2, $3, $4)", // registers username and password, leaves bio and socials empty for now
    username,
    hashed_password,
    "",
    [""],
  );

  client.release();
  return result;
};

export const dblogin = async (username: string) => {
  const client = await pool.connect();
  const result = await client.queryArray(
    "Select password,id from  users where username =$1",
    username,
  ); // queries password from username

  client.release();
  return result;
};

export const dbaccesspost = async (userid:number) => {
  const client = await pool.connect();
  const  result = await client.queryArray(
    "Select * from  posts where author_id =$1)",
    userid,
  ); // queries password from username

  client.release();
  return result;
};

export const dbcreatepost = async (p: Post) => {
  const client = await pool.connect();
  const result = await  client.queryObject(
    "INSERT INTO posts (author_id, title, content, published_at, VALUES ($1, $2, $3, $4)", // inserts new post info
    p.author_id,
    p.title,
    p.content,
    p.published,
  );
  client.release()
  return result;
};

export const dbdeletepost = async (p: Post) => {
  const client = await pool.connect();
  const result = await client.queryArray(
    "DELETE from posts where post_id =$1",
    p.post_id,
  ); // deletes post
  client.release()
  return result;
};
