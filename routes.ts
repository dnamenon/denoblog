import { RouterContext,send} from "https://deno.land/x/oak/mod.ts";
import { renderFileToString } from "https://deno.land/x/dejs/mod.ts";

export const login = async (ctx: RouterContext) => {
    ctx.response.body = await renderFileToString(
      `${Deno.cwd()}/public/login.ejs`,
      {
        error: false,
      },
    );
  }



  export const css = async (ctx: RouterContext) => {
    await send(ctx, ctx.request.url.pathname, {
        root: Deno.cwd(),
      });
  }