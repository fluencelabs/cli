import { Match, Switch } from "solid-js";
import { createStore, produce } from "solid-js/store";

export default function App() {
  const events = new EventSource("/events");
  const [state, setState] = createStore<{
    server?:
      | {
          tag: "transaction";
          data: TransactionProps;
        }
      | { tag: "closeTab"; data: never };
  }>({});

  events.onmessage = (event) => {
    const parsedData = JSON.parse(event.data);

    if (parsedData.tag === "closeTab") {
      window.close();
      return;
    }

    setState(
      produce((prev) => {
        prev.server = parsedData;
      }),
    );
  };

  return (
    <>
      <Switch fallback={<div>CLI is not connected</div>}>
        <Match when={state.server?.tag === "transaction"}>
          {/* @ts-ignore */}
          <Transaction {...state.server?.data} />
        </Match>
      </Switch>
    </>
  );
}

type TransactionProps = {
  name: string;
  transactionData: string;
};

function Transaction(props: TransactionProps) {
  return (
    <>
      <h1>{props.name}</h1>
      <div>{props.transactionData}</div>
    </>
  );
}
