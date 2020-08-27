import * as flags from '@oclif/command/lib/flags';
import Command from "../base";
import {getConnection} from "../connection";


export default class AddBlueprint extends Command {
  static description = 'Add a blueprint to a node.'

  static examples = [
    `$ fluence add_blueprint
[
  '..',
  '..'
]
`,
  ]

  static flags = {
    ...Command.flags,
    targetPeer: flags.string({char: 't', description: 'Host to connect to', required: false}),
    name: flags.string({char: 'n', description: 'A name of a blueprint', required: true}),
    deps: flags.string({char: 'd', description: 'List of blueprint dependencies', required: true, multiple: true})
  }

  static args = []

  async run() {
    const {flags} = this.parse(AddBlueprint)

    let conn = await getConnection(flags.host, flags.port, flags.peer, flags.secretKey);

    let result = await conn.addBlueprint(flags.name, flags.deps, flags.targetPeer)

    if (result) {
      this.log(JSON.stringify("Blueprint is added successfully."))
    }
  }
}
