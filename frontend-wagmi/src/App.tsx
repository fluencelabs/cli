import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useRef, useState } from "react";
import { useChainId, useClient, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt } from "wagmi";
import { dar, kras } from "./chains";

// sample tx data - sending 0 anything to 0x1234567890123456789012345678901234567890
const TO = "0x1234567890123456789012345678901234567890";
const VALUE = 0n;
const DATA = "0x";

export function App() {
  const { chain } = useClient();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const { sendTransaction, isPending, isError, error, data: hash, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleSendTx = async () => {
    sendTransaction({
      to: TO,
      value: VALUE,
      data: DATA,
    });
  };

  const messageSentGuard = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (isSuccess && hash && !messageSentGuard.current[hash]) {
      messageSentGuard.current[hash] = true;
      console.log(hash, "Transaction successful!", isSuccess);
      // HERE to send message about tx success
    }
  }, [isSuccess]);

  const [curChain, setCurChain] = useState<typeof dar | typeof kras | null>(null);

  const rerenderGuard = useRef(false); // Prevents the initial render from triggering the useEffect
  useEffect(() => {
    if (rerenderGuard.current) return;
    rerenderGuard.current = true;
    // Shall we send a message to backend that we are ready?
    console.log("App is ready");
  }, []);

  useEffect(() => {
    if (error) {
      console.error("Error to send", error);
      // HERE to send message about tx error
    }
  }, [error]);

  useEffect(() => {
    if (!curChain || chainId === curChain.id) return;
    switchChain({ chainId: curChain.id });
  }, [curChain, chain]); // `chain` to trigger after wallet connection

  return (
    <div style={{ paddingTop: "40px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div>{chain.name}</div>
        <div style={{ width: "20px" }} />
        <div style={{}}>
          <ConnectButton
            chainStatus={{
              largeScreen: "none",
              smallScreen: "none",
            }}
          />
        </div>
      </div>
      <div style={{ marginTop: "30px" }}>
        {isPending && <div>Please sign transaction in your wallet</div>}
        {isConfirming && <div>Confirming...</div>}
        {isSuccess && (
          <div>
            <a
              href={`${chain.blockExplorers.default.url}tx${hash}`}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none" }} // no underline
            >
              Transaction successful!
            </a>
          </div>
        )}
        {isError && <div>Error! {error.message}</div>}
      </div>

      <div>
        <div>&nbsp;</div>
        <div>&nbsp;</div>
        <div>&nbsp;</div>
        <div>&nbsp;</div>
        <div>The buttons are only for demo, shall be triggered by backend:</div>
        {/* Buttons are only for demo, shall be triggered by backend */}
        <button
          type="button"
          onClick={() => {
            setCurChain(dar);
            reset();
          }}
        >
          Switch to Dar
        </button>
        <button
          type="button"
          onClick={() => {
            setCurChain(kras);
            reset();
          }}
        >
          Switch to Kras
        </button>
        <button type="button" onClick={handleSendTx}>
          Sample tx
        </button>
      </div>
    </div>
  );
}
