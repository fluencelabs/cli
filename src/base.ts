import Command, {flags} from '@oclif/command'

export default abstract class extends Command {

  static flags = {
    help: flags.help({char: 'h'}),
    logLevel: flags.string({char: 'l', description: '\'trace\' | \'debug\' | \'info\' | \'warn\' | \'error\' | \'silent\'', default: "info"}),
    host: flags.string({char: 'h', description: 'Host to connect to', default: "127.0.0.1"}),
    port: flags.integer({char: 'p', description: 'Port to connect to', default: 9100}),
    peer: flags.string({char: 'P', description: 'Host to connect to', required: true}),
    secretKey: flags.string({
      char: 's',
      description: `Client's secret key. A new one will be generated and printed if this flag is not specified`,
      required: false
    })
  }
}
