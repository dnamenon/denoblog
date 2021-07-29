import { RouterContext, send } from "https://deno.land/x/oak@v8.0.0/mod.ts";
import { renderFileToString } from "https://deno.land/x/dejs@0.10.1/mod.ts";
import * as bcrypt from "https://deno.land/x/crypt@v0.1.0/bcrypt.ts";
import { dblogin } from "./db_execs.ts";

export const login = async (ctx: RouterContext) => {
  ctx.response.body = await renderFileToString(
    `${Deno.cwd()}/public/login.ejs`, //renders login page
    {
      error: false,
    },
  );
};

export const postLogin = async (ctx: RouterContext) => { //handles login post request
    const formdata = await ctx.request.body();
    const values = await formdata.value;
    console.log(values);
    
  const username = "string";
  const password = "string";

  let user_details = (await dblogin(username)).rows[0];

  if (user_details != null) {
    let hashed_password = user_details[0] as string;

    const result = await bcrypt.compare(password, hashed_password);

    if (result) {
      let user_id = user_details[1];

      ctx.cookies.set("user", user_id as string);
      ctx.response.redirect("/user/:id");
    }
  } else {
      console.log("login failed");
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/login.ejs`,
      {
        error: "Incorrect password",
      },
    );
  }
};

export const logout = async (ctx: RouterContext) => {
  ctx.cookies.delete("user");
  ctx.response.redirect("/");
};

export const staticfiles = async (ctx: RouterContext) => {
  await send(ctx, ctx.request.url.pathname, { //renders static files
    root: Deno.cwd(),
  });
};
