import * as flags from '@oclif/command/lib/flags';
import Command from "../base";
import {getConnection} from "../connection";


export default class Modules extends Command {
  static description = 'Get a list of modules from a node.'

  static examples = [
    `$ fluence modules --host 134.209.186.43 --port 9100 --peer 12D3KooWPnLxnY71JDxvB3zbjKu9k1BCYNthGZw6iGrLYsR1RnWM
[
  "dd0b2987-c5fa-468f-bf0a-55ff35a01c29",
  "80ebdb30-7927-4bbe-a2ca-e469e3f32d40",
  "24b47793-2706-41fc-91b2-675ff38ebda0",
  "3a28ca64-d653-4266-acfc-560b9f352750"
]

`,
  ]

  static flags = {
    ...Command.flags,
    targetPeer: flags.string({char: 't', description: 'Host to connect to', required: false}),
  }

  static args = []

  async run() {
    const {flags} = this.parse(Modules)

    let conn = await getConnection(flags);

    let modulesList = await conn.getAvailableModules(flags.targetPeer)

    this.log(JSON.stringify(modulesList, undefined, 2));

    await conn.disconnect();
  }
}
