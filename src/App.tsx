import React from 'react';
import { useState, useEffect} from 'react';
import './App.css';
import * as web3 from '@solana/web3.js'
import { Buffer } from 'buffer';
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction
} from "@solana/web3.js"

// @ts-ignore
window.Buffer = Buffer;

type DisplayEncoding = "utf8" | "hex";

type PhantomEvent = "disconnect" | "connect" | "accountChanged";
type PhantomRequestMethod = 
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

const getProvider = (): PhantomProvider | undefined => {
  if("solana" in window) {
    const provider = window.solana as any;
    if(provider.isPhantom) return provider as PhantomProvider;
  }
}

function App() {
  const [provider, setProvider] = useState<PhantomProvider | undefined>(
    undefined
  );

  const [walletKey, setWalletKey] = useState<PhantomProvider | undefined>(
    undefined
  );

  useEffect(() => {
    const provider = getProvider();

    if(provider) setProvider(provider);
    else setProvider(undefined);
  });

  const connectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

    if(solana) {
      try {
        const response = await solana.connect();
        console.log('wallet account', response.publicKey.toString());
        
        setWalletKey(response.publicKey.toString());
      } catch (err) {

      }
    }
  }

  const [publicKey, setPublicKey] = useState([] as any);
  const [balance, setBalance] = useState(0);
  const [phantomBalance, setPhantomBalance] = useState(0);
  
  const createPair = async () => {
    const newPair = Keypair.generate();
    setPublicKey(newPair.secretKey);
    try {
      const connection  = new Connection(clusterApiUrl("devnet"), "confirmed");

      const airdropSignature = await connection.requestAirdrop(
        new PublicKey(newPair.publicKey),
        2 * LAMPORTS_PER_SOL
      )
      await connection.confirmTransaction(airdropSignature);

      const bal = await connection.getBalance(newPair.publicKey)
      setBalance(bal/LAMPORTS_PER_SOL);

      // @ts-ignore
      const bal2 = await connection.getBalance(new PublicKey(walletKey.toString()))
      setPhantomBalance(bal2/LAMPORTS_PER_SOL);
      

    } catch (err) {
      console.log(err);
      
    }
  }

  const transfer = async () => {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const secret = Uint8Array.from(publicKey);
    const key = Keypair.fromSecretKey(secret);

    var transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: key.publicKey,
        // @ts-ignore
        toPubkey: new PublicKey(walletKey.toString()),
        lamports: 1.9*LAMPORTS_PER_SOL
      })
    )

    var signature = await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [key]
    )
    const bal = await connection.getBalance(key.publicKey)
    // @ts-ignore
    const bal2 = await connection.getBalance(new PublicKey(walletKey.toString()))
    
    setPhantomBalance(bal2/LAMPORTS_PER_SOL);
    setBalance(bal/LAMPORTS_PER_SOL);

    console.log('success');
  }

  return (
    <div className="App">
      <div className='window'>
      {provider && walletKey && <p>Connected to Phantom Wallet</p>}

      <button className='create-btn' onClick={createPair}>Create a new Solana account</button>
      <p>Balance: {balance}</p>
      
      {(!provider && !walletKey) && (
        <button className='create-btn' onClick={connectWallet}>Connect to Phantom Wallet</button>
      )}
      {!provider && (
        <p>
          No provider found. Install{" "}
          <a href="https://phantom.app/">Phantom Browser extension</a>
          </p>
        )}


        <button className='create-btn' onClick={transfer}>Transfer</button>
        <p>Phantom Wallet Balance: {phantomBalance}</p>
      </div>

    </div>
  );
}

export default App;
