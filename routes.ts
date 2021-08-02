import { RouterContext, send } from "https://deno.land/x/oak@v8.0.0/mod.ts";
import { renderFileToString } from "https://deno.land/x/dejs@0.10.1/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.2.4/mod.ts";
import { dbcreatepost, dblogin, dbregister,dbaccesspost,dbgetusername,dbcheckpostbelongstouser,dbdeletepost } from "./db_execs.ts";
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
    let user_details = (await dblogin(username)).rows[0];

    if (user_details != null) {
      let hashed_password = user_details[0] as string;
      console.log(password + " " + hashed_password);

      const result = await bcrypt.compare(password, hashed_password);
      console.log(result);
      if (result) {
        let user_id = user_details[1];

        ctx.cookies.set("user", user_id as string);
        ctx.response.redirect("/user/:" + user_id);
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

export const postRegister = async (ctx: RouterContext) => { //handles login post request
  const formdata = await ctx.request.body({ type: "form" });
  const values = await formdata.value;

  const username = values.get("username");
  const password = values.get("password");
  if (username != null && password != null) {
    const hashed_password = await bcrypt.hash(password);

    if (await dbregister(username, hashed_password)) {
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
  const cookie_id = ctx.cookies.get("user");

  if (cookie_id === undefined) {
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/login.ejs`,
      {
        error: "please login to access this page",
      },
    );
  }

  if ((page_id as string) === cookie_id) {
    const posts = (await dbaccesspost(cookie_id)).rows.reverse();
    const username = (await dbgetusername(cookie_id)).rows;
    
    if(posts != null && username != null){
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/userhome.ejs`,
      {
        error: false,
        posts:posts,
        username:username,
      },
    );
    }else{
      ctx.response.body = await renderFileToString(
        `${Deno.cwd()}/public/userhome.ejs`,
        {
          error: "no posts available",
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

export const createpost = async (ctx: RouterContext) => {
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

  if (file_info === undefined) return;
  const content_file = file_info[0].filename;

  const file = await Deno.open(content_file as string);
  const decoder = new TextDecoder("utf-8");
  const content = decoder.decode(await Deno.readAll(file));

  const p: Post = {
    post_id: undefined,
    author_id: author_id,
    title: title,
    content: content,
    published: date,
  };
  if (await dbcreatepost(p)) {
    console.log("post created");
    ctx.response.redirect("/user/:"+cookie_id);


  } else {
    ctx.response.status = 500;
    ctx.response.body = "post creation failed";
    return;
  }
};

export const deletepost = async (ctx: RouterContext) => {
  
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
  const user_id_check = (await dbcheckpostbelongstouser(toDelete as string)).rows as unknown; //checks the post submitted for deleteion with the user id stored in the cookie
  console.log(user_id_check + " " + cookie_id);
  if(user_id_check != null && +(cookie_id as string) === +(user_id_check as string)){
    if (await dbdeletepost(toDelete as string)) {
      console.log("post deleted");
      ctx.response.redirect("/user/:"+cookie_id);
  
  
    } else {
      ctx.response.status = 500;
      ctx.response.body = "post deletion failed";
      return;
    }

  }else{

    ctx.response.status = 500;
    ctx.response.headers.set("Content-Type", "text/html; charset=utf-8");
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/404.ejs`,
      {},
    );
    return;

  }
 
};

export const logout = async (ctx: RouterContext) => {
  ctx.cookies.delete("user");
  ctx.response.redirect("/login"); //delete cookies, logout
};

export const staticfiles = async (ctx: RouterContext) => {
  await send(ctx, ctx.request.url.pathname, { //renders static files
    root: Deno.cwd(),
  });
};
