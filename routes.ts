import { RouterContext, send } from "https://deno.land/x/oak@v8.0.0/mod.ts";
import { renderFileToString } from "https://deno.land/x/dejs@0.10.1/mod.ts";
import * as bcrypt from "https://deno.land/x/crypt@v0.1.0/bcrypt.ts";
import { MultipartReader } from "https://deno.land/std/mime/mod.ts";
import { dblogin, dbregister } from "./db_execs.ts";
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

      const result = await bcrypt.compare(password, hashed_password);

      if (result) {
        let user_id = user_details[1];
        console.log(user_id + "login success");
        ctx.cookies.set("user", user_id as string);
        ctx.response.redirect("/user/:id");
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
  }
  else {
    console.log("registration failed");
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/registration.ejs`,
      {
        error: "no password or username",
      },
    );
  }
};

export const userhome = async(ctx:RouterContext) =>{
    const page_id_raw= ctx.params.id;
    if(page_id_raw === undefined){
        ctx.response.status = 404;
        ctx.response.body = { msg: "Page Not Found" };
        return;
    }
    const page_id = page_id_raw.substring(1,);
    const cookie_id = ctx.cookies.get("user");

    console.log(page_id + " " + cookie_id);

    if(cookie_id === undefined){
        ctx.response.body = await renderFileToString(
            `${Deno.cwd()}/public/login.ejs`,
            {
              error: "please login to access this page",
            },
          );

    }


    if((page_id as string) === cookie_id){

        ctx.response.body = await renderFileToString(
            `${Deno.cwd()}/public/userhome.ejs`,
            {
              error: "nice",
            },
          );

        


    }else{
        ctx.response.redirect("/user/:"+ cookie_id);
    }



}


export const createpost=  async(ctx:RouterContext) =>{
    const formdata = await ctx.request.body({ type: "form" });
    const values = await formdata.value;


}


export const logout = async (ctx: RouterContext) => {
  ctx.cookies.delete("user");
  ctx.response.redirect("/"); //delete cookies, logout
};

export const staticfiles = async (ctx: RouterContext) => {
  await send(ctx, ctx.request.url.pathname, { //renders static files
    root: Deno.cwd(),
  });
};


