import { RouterContext, send } from "https://deno.land/x/oak@v8.0.0/mod.ts";
import { renderFileToString } from "https://deno.land/x/dejs@0.10.1/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.2.4/mod.ts";
import { Marked } from "https://deno.land/x/markdown@v2.0.0/mod.ts";
import { copy, ensureFile } from "https://deno.land/std/fs/mod.ts";
import { unescapeHtml } from "https://deno.land/x/escape/mod.ts";
import {
  dbaccesspost,
  dbcheckpostbelongstouser,
  dbcreatepost,
  dbdeletepost,
  dbedituserprofile,
  dbgetuserdetails,
  dblogin,
  dbregister,
} from "./db_execs.ts";
import { Post } from "./post.ts";

export const login = async (ctx: RouterContext) => {
  ctx.response.body = await renderFileToString(
    `${Deno.cwd()}/public/login.ejs`, //renders login page
    {
      error: false,
    },
  );
};

export const postLogin = async (ctx: RouterContext) => { //handles login post request
  const formdata = await ctx.request.body({ type: "form" });
  const values = await formdata.value;

  const username = values.get("username");
  const password = values.get("password");

  if (username != null && password != null) {
    let user_details = (await dblogin(username)).rows[0]; // gets salted and hashed password from database

    if (user_details != null) {
      let hashed_password = user_details[0] as string;

      const result = await bcrypt.compare(password, hashed_password);// compares submitted password vs hashed pasword
      console.log(result); 
      if (result) {
        let user_id = user_details[1];

        ctx.cookies.set("user", user_id as string);
        ctx.response.redirect("/user/:" + user_id); // redirects user to their home page
      } else {
        console.log("login failed");
        ctx.response.body = await renderFileToString(
          `${Deno.cwd()}/public/login.ejs`,
          {
            error: "Incorrect password or username",
          },
        );
      }
    } else {
      console.log("login failed");
      ctx.response.body = await renderFileToString(
        `${Deno.cwd()}/public/login.ejs`,
        {
          error: "Incorrect password or username",
        },
      );
    }
  } else {
    console.log("login failed");
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/login.ejs`,
      {
        error: "no password or username",
      },
    );
  }
};

export const register = async (ctx: RouterContext) => {
  ctx.response.body = await renderFileToString(
    `${Deno.cwd()}/public/register.ejs`, //renders register page
    {
      error: false,
    },
  );
};

export const postRegister = async (ctx: RouterContext) => { //handles register post request
  const formdata = await ctx.request.body({ type: "form" });
  const values = await formdata.value;

  const username = values.get("username");
  const password = values.get("password");
  if (username != null && password != null) {
    const hashed_password = await bcrypt.hash(password); // salts and hashes password/

    if (await dbregister(username, hashed_password)) { // submits user info to database//
      console.log("registration success");
      ctx.response.redirect("/login");
    } else {
      console.log("registration failed");
      ctx.response.body = await renderFileToString(
        `${Deno.cwd()}/public/register.ejs`,
        {
          error: "registration failed",
        },
      );
    }
  } else {
    console.log("registration failed");
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/registration.ejs`,
      {
        error: "no password or username",
      },
    );
  }
};

export const userhome = async (ctx: RouterContext) => {
  const page_id_raw = ctx.params.id;
  if (page_id_raw === undefined) { // checks if page url has id
    ctx.response.status = 404;
    ctx.response.headers.set("Content-Type", "text/html; charset=utf-8");
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/404.ejs`,
      {},
    );
    return;
  }
  const page_id = page_id_raw.substring(1);
  const cookie_id = ctx.cookies.get("user");

  if (cookie_id === undefined) { // checks if user is signed in//
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/login.ejs`,
      {
        error: "please login to access this page",
      },
    );
  }

  if ((page_id as string) === cookie_id) { // checks if this is the signed in user's homepage
    const posts = (await dbaccesspost(cookie_id)).rows.reverse(); // gets post and user details from the database
    const userdetails = (await dbgetuserdetails(cookie_id)).rows;
      
    if (posts != null && userdetails != null) {
      ctx.response.body = await renderFileToString(
        `${Deno.cwd()}/public/userhome.ejs`,
        {
          error: false,
          posts: posts,
          userdetails: userdetails[0],
        },
      );
    } else {
      ctx.response.body = await renderFileToString(
        `${Deno.cwd()}/public/userhome.ejs`,
        {
          error: "can't render user data",
        },
      );
    }
  } else {
    ctx.response.status = 404;
    ctx.response.headers.set("Content-Type", "text/html; charset=utf-8");
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/404.ejs`,
      {},
    );
    return;
  }
};

export const createpost = async (ctx: RouterContext) => { // handles post request containing mark down file and enters post data into the databse
  const cookie_id = ctx.cookies.get("user");

  if (cookie_id === undefined) {
    ctx.response.headers.set("Content-Type", "text/html; charset=utf-8");
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/404.ejs`,
      {},
    );
  }

  const formdata = await ctx.request.body({ type: "form-data" });
  const values = await formdata.value.read();
  const date = new Date().toLocaleString();
  const author_id = cookie_id as string;

  const title = values.fields.title;
  const file_info = values.files;

  if (file_info === undefined) {
    ctx.response.status = 500;
    ctx.response.body = "post creation failed";
    return;
  }
  const content_file = file_info[0].filename;
  console.log(content_file);

  

  const file = await Deno.open(content_file as string);
  const decoder = new TextDecoder("utf-8");
  const content = decoder.decode(await Deno.readAll(file));

  if(content === ""){
    ctx.response.status = 500;
    ctx.response.body = "file was empty, post creation failed";
    return;
  }

  file.close();
  await Deno.remove(content_file as string);

  const p: Post = {
    post_id: undefined,
    author_id: author_id,
    title: title,
    content: content,
    published: date,
  };
  if (await dbcreatepost(p)) {
    console.log("post created");
    ctx.response.redirect("/user/:" + cookie_id);
  } else {
    ctx.response.status = 500;
    ctx.response.body = "post creation failed";
    return;
  }
};

export const deletepost = async (ctx: RouterContext) => { // takes post request and deletes specified post id
  const cookie_id = ctx.cookies.get("user");

  if (cookie_id === undefined) {
    ctx.response.status = 404;
    ctx.response.headers.set("Content-Type", "text/html; charset=utf-8");
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/404.ejs`,
      {},
    );
    return;
  }
  const formdata = await ctx.request.body({ type: "form" });
  const values = await formdata.value;

  const toDelete = values.get("delete");
  const user_id_check = (await dbcheckpostbelongstouser(toDelete as string))
    .rows as unknown;
  console.log(user_id_check + " " + cookie_id);
  if (
    user_id_check != null &&
    +(cookie_id as string) === +(user_id_check as string) //checks the post submitted for deleteion belong to user  with the user id stored in the cookie
  ) {
    if (await dbdeletepost(toDelete as string)) {
      console.log("post deleted");
      ctx.response.redirect("/user/:" + cookie_id);
    } else {
      ctx.response.status = 500;
      ctx.response.body = "post deletion failed";
      return;
    }
  } else {
    ctx.response.status = 500;
    ctx.response.headers.set("Content-Type", "text/html; charset=utf-8");
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/404.ejs`,
      {},
    );
    return;
  }
};

export const editprofile = async (ctx: RouterContext) => { // takes post request and edits user profile details
  const cookie_id = ctx.cookies.get("user");

  if (cookie_id === undefined) {
    ctx.response.status = 404;
    ctx.response.headers.set("Content-Type", "text/html; charset=utf-8");
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/404.ejs`,
      {},
    );
    return;
  }

  const formdata = await ctx.request.body({ type: "form-data" });
  const values = await formdata.value.read();
  const file_info = values.files;

  if (
    file_info === undefined || file_info[0] === undefined ||
    file_info[0].filename === undefined
  ) {
    ctx.response.status = 500;
    ctx.response.body = "post creation failed";
    return;
  }
  const content_file = file_info[0].filename;
  const bio = values.fields.bio;
  const insta = values.fields.instagram;
  const twitter = values.fields.twitter;
  const github = values.fields.github;
  const socials: string[] = [insta, twitter, github];

  const ext = content_file.split(".").pop();

  const newfilepath = `${Deno.cwd()}/public/userprofile/` + cookie_id + "." +
    ext;
  const newfilename = cookie_id + "." + ext;

  if (await dbedituserprofile(bio, socials, newfilename, cookie_id)) { // submits user info to database stores user profile pic to userpofile directory
    await ensureFile(newfilepath);

    await copy(content_file, newfilepath, {
      overwrite: true,
    });
    await Deno.remove(content_file as string);
    console.log("profile edited");
    ctx.response.redirect("/profile/:" + cookie_id);
  } else {
    ctx.response.status = 500;
    ctx.response.body = "profile edit failed";
    return;
  }
};

export const blog = async (ctx: RouterContext) => {
  const page_id_raw = ctx.params.id;
  if (page_id_raw === undefined) {
    ctx.response.status = 404;
    ctx.response.headers.set("Content-Type", "text/html; charset=utf-8");
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/404.ejs`,
      {},
    );
    return;
  }
  const page_id = page_id_raw.substring(1);

  const posts = (await dbaccesspost(page_id)).rows.reverse(); // gets post and user details from the database
  const userdetails = (await dbgetuserdetails(page_id)).rows;
      
    if (posts != null && userdetails != null) {
      for (let i = 0; i < posts.length; i++) {

        let parsed = Marked.parse(posts[i][3] as string);
        let unescaped = unescapeHtml(parsed.content);
        posts[i][3] = unescaped;
      }

      ctx.response.body = await renderFileToString(
        `${Deno.cwd()}/public/blog.ejs`,
        {
          error: false,
          posts: posts,
          userdetails: userdetails[0],
        },
      );
    } else {
      ctx.response.body = await renderFileToString(
        `${Deno.cwd()}/public/blog.ejs`,
        {
          error: "can't render user data",
        },
      );
    }
};

export const profile = async (ctx: RouterContext) => {
  const page_id_raw = ctx.params.id;
  if (page_id_raw === undefined) {
    ctx.response.status = 404;
    ctx.response.headers.set("Content-Type", "text/html; charset=utf-8");
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/404.ejs`,
      {},
    );
    return;
  }
  const page_id = page_id_raw.substring(1);
 // gets user details from the database
  const userdetails = (await dbgetuserdetails(page_id)).rows;
      
    if (userdetails != null) {
      
      ctx.response.body = await renderFileToString(
        `${Deno.cwd()}/public/profile.ejs`,
        {
          error: false,
          userdetails: userdetails[0],
        },
      );
    } else {
      ctx.response.body = await renderFileToString(
        `${Deno.cwd()}/public/profile.ejs`,
        {
          error: "can't render user data",
        },
      );
    }
};

export const logout = async (ctx: RouterContext) => {
  ctx.cookies.delete("user");
  ctx.response.redirect("/login"); //delete cookies, logout
};

export const staticfiles = async (ctx: RouterContext) => {
  await send(ctx, ctx.request.url.pathname, { //grants access to  static files 
    root: `${Deno.cwd()}`,
  });
};
