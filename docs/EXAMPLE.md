# Currently supported workflow example

1. Run `fluence service add 'https://github.com/fluencelabs/services/blob/master/adder.tar.gz?raw=true'` to add Adder service to your application. Fluence CLI will suggest you to init project if it wasn't already initialized. Choose `ts` template.
1. Run `fluence run -f 'helloWorld("Fluence")'` if you want to run `helloWorld` example aqua function from `src/aqua/main.aqua`.
1. Run `fluence deploy` to deploy the application described in `fluence.yaml`
1. Uncomment Adder and App aqua in `src/aqua/main.aqua`:
    ```aqua
    import App from "deployed.app.aqua"
    import Adder from "services/adder.aqua"
    export App, addOne

    -- snip --

    func addOne(x: u64) -> u64:
        services <- App.services()
        on services.adder.default!.peerId:
            Adder services.adder.default!.serviceId
            res <- Adder.addOne(x)
        <- res
    ```
    `"deployed.app.aqua"` file was generated after you ran `fluence deploy` and it is located at `.fluence/aqua/deployed.app.aqua`. 
    
    `App.services()` method returns ids of the previously deployed services that you can use in your aqua code (info about previously deployed services is stored at `.fluence/app.yaml`).

1. Run `fluence aqua` to compile `src/aqua/main.aqua` to typescript
1. Open `src/ts/src/index.ts` example file and uncomment newly generated imports and code that uses those imports
    ```ts
    import { addOne } from "./aqua/main.ts";
    import { registerApp } from "./aqua/app.ts";

    // ---snip---

      registerApp()
      console.log(await addOne(1))
    ```

1. Go to `src/ts` directory and run `npm run start`. All the functions from `src/aqua/main.aqua` will run and you will see:
    - `Hello, Fluence` as a result of `helloWorld("Fluence")`
    - `2` as a result of `addOne(1)`
1. Run `fluence remove` to remove the previously deployed fluence application

