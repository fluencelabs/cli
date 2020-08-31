import * as flags from '@oclif/command/lib/flags';
import Command from "../base";
import {getConnection} from "../connection";


export default class AddBlueprint extends Command {
  static description = 'Add a blueprint to a node.'

  static examples = [
    `$ fluence add_blueprint --name test123 --deps 811deb12-a9ab-4cba-b219-9b48ce7dd5ce 3a28ca64-d653-4266-acfc-560b9f352750 --host 134.209.186.43 --port 9100 --peer 12D3KooWPnLxnY71JDxvB3zbjKu9k1BCYNthGZw6iGrLYsR1RnWM
Blueprint is added successfully."
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

    let conn = await getConnection(flags);

    let result = await conn.addBlueprint(flags.name, flags.deps, flags.targetPeer)

    if (result) {
      this.log(JSON.stringify("Blueprint is added successfully."))
    }

    await conn.disconnect();
  }
}
