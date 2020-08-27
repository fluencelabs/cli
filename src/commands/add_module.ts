import * as flags from '@oclif/command/lib/flags';
import Command from "../base";
import {getConnection} from "../connection";
const fs = require('fs');


export default class AddModule extends Command {
  static description = 'Add a module to a node.'

  static examples = [
    `$ fluence add_module
[
  '..',
  '..'
]
`,
  ]

  static flags = {
    ...Command.flags,
    targetPeer: flags.string({char: 't', description: 'Host to connect to', required: false}),
    name: flags.string({char: 'n', description: 'A name of a module', required: true}),
    path: flags.string({char: 'a', description: 'A path to a WASM module', required: true}),
  }

  static args = []

  async run() {
    const {flags} = this.parse(AddModule)

    let conn = await getConnection(flags);

    const contents = fs.readFileSync(flags.path, {encoding: 'base64'});

    let result = await conn.addModule(contents, flags.name, 100, [], undefined, [], flags.targetPeer);

    if (result) {
      this.log(JSON.stringify("Module is added successfully."))
    }
  }
}
