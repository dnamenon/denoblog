
  import {
    Application,
    Router,
    RouterContext,

  }  from "https://deno.land/x/oak@v8.0.0/mod.ts";

  
 



  import {login,postLogin,register,postRegister,userhome,editprofile,createpost,deletepost,staticfiles,logout} from "./routes.ts"; // handler functions for router stored here



const app = new Application();
const router = new Router();

router// directs routes to handlers
  .get("/login",login) 
  .post("/login",postLogin)
  .get("/register",register) 
  .post("/register",postRegister)
  .get("/user/:id",userhome) 
  .post("/edit_profile", editprofile ) 
  .post("/create_post",createpost) 
  .post("/delete_post",deletepost) 
  .get("/logout",logout)
  .get("/public/css/:path+",staticfiles)
  .get("/public/userprofile/:path+",staticfiles)



app.addEventListener('error', evt => {
    console.log(evt.error);
  });





app.use(router.routes()); // app uses router
app.use(router.allowedMethods());


app.listen({ port: 8000 }); // app listening on this port
console.log("Started listening on port: 8000");