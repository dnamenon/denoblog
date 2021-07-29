import { RouterContext,send} from "https://deno.land/x/oak/mod.ts";
import { renderFileToString } from "https://deno.land/x/dejs/mod.ts";

export const login = async (ctx: RouterContext) => {
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/login.ejs`,  //renders login page
      {
        error: false,
      },
    );
  }



  export const staticfiles = async (ctx: RouterContext) => {
    await send(ctx, ctx.request.url.pathname, {//renders static files
        root: Deno.cwd(),
      });
  }