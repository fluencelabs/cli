import { Match, Switch, Show, createSignal } from "solid-js";
import { createStore, produce } from "solid-js/store";
import "./App.css";

const CLOSE_TIMEOUT_LENGTH = 1000 * 5;

export default function App() {
  const events = new EventSource("/events");
  const [state, setState] = createStore<{
    server?: {
      tag: "transaction";
      data: TransactionProps;
    };
  }>({});
  const [isCLIConnected, setIsCLIConnected] = createSignal(true);
  const [isSpinnerVisible, setIsSpinnerVisible] = createSignal(false);

  events.onmessage = (event) => {
    const parsedData = JSON.parse(event.data);

    setIsSpinnerVisible(false);
    setState(
      produce((prev) => {
        prev.server = parsedData;
      }),
    );
  };

  events.onerror = () => {
    setIsCLIConnected(false);
    setTimeout(() => {
      window.close();
    }, CLOSE_TIMEOUT_LENGTH);
  };

  function handleSignedTransaction() {
    setIsSpinnerVisible(true);
    void fetch("/response", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "signed" }),
    });
  }

  return (
    <>
      <Show when={!isCLIConnected()}>
        <div>Fluence CLI disconnected. Go back to your terminal</div>
      </Show>
      <Show when={isCLIConnected()}>
        <Switch>
          <Match when={state.server?.tag === "transaction"}>
            {/* @ts-ignore */}
            <Transaction
              {...state.server?.data}
              handleSignedTransaction={handleSignedTransaction}
            />
          </Match>
        </Switch>
      </Show>
      <Show when={isCLIConnected() && isSpinnerVisible()}>
        <div class="spinner" />
      </Show>
    </>
  );
}

type TransactionProps = {
  name: string;
  transactionData: string;
  handleSignedTransaction: () => void;
};

function Transaction(props: TransactionProps) {
  return (
    <>
      <h1>{props.name}</h1>
      <p>{props.transactionData}</p>
      <button onClick={props.handleSignedTransaction}>Sign transaction</button>
    </>
  );
}
