import { For, Match, Switch } from "solid-js";
import { createStore, produce } from "solid-js/store";

export default function App() {
  const events = new EventSource("/events");
  const [state, setState] = createStore<{
    server?:
      | {
          tag: "transaction";
          data: TransactionProps;
        }
      | {
          tag: "success";
          data: TransactionSuccessProps;
        };
  }>({});

  events.onmessage = (event) => {
    const parsedData = JSON.parse(event.data);
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
          <Transaction {...state.server?.data} />
        </Match>
        <Match when={state.server?.tag === "success"}>
          <TransactionSuccess {...state.server?.data} />
        </Match>
      </Switch>
    </>
  );
}

type TransactionProps = {
  name: string;
  steps: string[];
  currentStep: number;
  data: string;
};

function Transaction(props: TransactionProps) {
  return (
    <>
      <h1>{props.name}</h1>
      <ol>
        <For each={props.steps}>
          {(step, index) => (
            <li
              style={
                index() < props.currentStep
                  ? { opacity: 0.5 }
                  : index() === props.currentStep
                  ? { color: "green" }
                  : {}
              }
            >
              {step}
            </li>
          )}
        </For>
      </ol>
      <button
        onClick={() => {
          void fetch("/response", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: `signed: ${props.data}` }),
          });
        }}
      >
        Sign transaction
      </button>
    </>
  );
}

type TransactionSuccessProps = {
  name: string;
};

function TransactionSuccess(props: TransactionSuccessProps) {
  void fetch("/response", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  return (
    <>
      <h1>{props.name}</h1>
      <p>Success</p>
    </>
  );
}
