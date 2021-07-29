
  import {
    Application,
    Router,
    RouterContext,

  }  from "https://deno.land/x/oak/mod.ts";

  import {login,staticfiles} from "./routes.ts"; // handler functions for router stored here



const app = new Application();
const router = new Router();

router
  .get("/login",login) // directs routes to handlers
  .get("/public/css/:path+",staticfiles)



app.addEventListener('error', evt => {
    console.log(evt.error);
  });





app.use(router.routes()); // app uses router
app.use(router.allowedMethods());


app.listen({ port: 8000 }); // app listening on this port
console.log("Started listening on port: 8000");