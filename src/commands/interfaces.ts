import * as flags from '@oclif/command/lib/flags';
import Command from "../base";
import {getConnection} from "../connection";


export default class Interfaces extends Command {
  static description = 'Get a list of interfaces from a node.'

  static examples = [
    `$ fluence interfaces --host 134.209.186.43 --port 9100 --peer 12D3KooWPnLxnY71JDxvB3zbjKu9k1BCYNthGZw6iGrLYsR1RnWM
[
  {
    "modules": [
      {
        "functions": [
          {
            "input_types": [
              "String"
            ],
            "name": "greeting",
            "output_types": [
              "String"
            ]
          }
        ],
        "name": "3a28ca64-d653-4266-acfc-560b9f352750"
      }
    ],
    "service_id": "2328a555-4e45-4326-b551-a1c804da771d"
  }
]
`,
  ]

  static flags = {
    ...Command.flags,
    targetPeer: flags.string({char: 't', description: 'Host to connect to', required: false}),
  }

  static args = []

  async run() {
    const {flags} = this.parse(Interfaces)

    let conn = await getConnection(flags);

    let interfaces = await conn.getActiveInterfaces(flags.targetPeer)

    this.log(JSON.stringify(interfaces, undefined, 2));

    await conn.disconnect();
  }
}
