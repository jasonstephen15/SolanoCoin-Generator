import React, { useState } from 'react'
import { Connection,clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import {Token,TOKEN_PROGRAM_ID} from "@solana/spl-token";

function App() { 

    // 3 States
    const [walletConnected, setWalletConnected] = useState(false); // 1. walletConnected - enables connection to crypto wallet
    const [provider, setProvider] = useState(); // 2. provider - stores wallet info of the user
    const [loading, setLoading] = useState(); // 3. loading - loading state
    
    // opens phantom solana wallet
    const getProvider = async () => {
        if ("solana" in window) {
        const provider = window.solana;
        if (provider.isPhantom) {
            return provider;
        }
        } else {
        window.open("https://www.phantom.app/", "_blank");
        }
    };
    
    //
    const walletConnectionHelper = async () => {
        if (walletConnected){
        //Disconnect Wallet
        setProvider();
        setWalletConnected(false);
        } else {
        const userWallet = await getProvider();
        if (userWallet) {
            await userWallet.connect();
            userWallet.on("connect", async () => {
                setProvider(userWallet);
                setWalletConnected(true);
            });
        }
        }
    }

    const airDropHelper = async () => {
        try {
            setLoading(true);
            const connection = new Connection(
                clusterApiUrl("devnet"),
                "confirmed"
            );
            const fromAirDropSignature = await connection.requestAirdrop(new PublicKey(provider.publicKey), LAMPORTS_PER_SOL);
            await connection.confirmTransaction(fromAirDropSignature, { commitment: "confirmed" });
            
            console.log(`1 SOL airdropped to your wallet ${provider.publicKey.toString()} successfully`);
            setLoading(false);
        } catch(err) {
            console.log(err);
            setLoading(false);
        }
     }

    const [isTokenCreated,setIsTokenCreated] = useState(false);
    const [createdTokenPublicKey,setCreatedTokenPublicKey] = useState(null);
    const [mintingWalletSecretKey,setMintingWalletSecretKey] = useState(null);

    const initialMintHelper = async () => {
    try {
        setLoading(true);
        const connection = new Connection(
            clusterApiUrl("devnet"),
            "confirmed"
        );
        
        // Creating Minting Wallet - the wallet that is actually creating the coin
        const mintRequester = await provider.publicKey;
        const mintingFromWallet = await Keypair.generate();
        setMintingWalletSecretKey(JSON.stringify(mintingFromWallet.secretKey));
        
        //we need some SOL to mint the coin, these lines deposit SOL into our account
        const fromAirDropSignature = await connection.requestAirdrop(mintingFromWallet.publicKey, LAMPORTS_PER_SOL);
        await connection.confirmTransaction(fromAirDropSignature, { commitment: "confirmed" });
        
        // Mint Object
        const creatorToken = await Token.createMint(connection, mintingFromWallet, mintingFromWallet.publicKey, null, 6, TOKEN_PROGRAM_ID);
        const fromTokenAccount = await creatorToken.getOrCreateAssociatedAccountInfo(mintingFromWallet.publicKey);
        await creatorToken.mintTo(fromTokenAccount.address, mintingFromWallet.publicKey, [], 1000000);
        
        const toTokenAccount = await creatorToken.getOrCreateAssociatedAccountInfo(mintRequester);
        const transaction = new Transaction().add(
            Token.createTransferInstruction(
                TOKEN_PROGRAM_ID,
                fromTokenAccount.address,
                toTokenAccount.address,
                mintingFromWallet.publicKey,
                [],
                1000000
            )
        );
        const signature=await sendAndConfirmTransaction(connection, transaction, [mintingFromWallet], { commitment: "confirmed" });
        
        console.log("SIGNATURE:",signature);
        
        setCreatedTokenPublicKey(creatorToken.publicKey);
        setIsTokenCreated(true);
        setLoading(false);
    } catch(err) {
        console.log(err)
        setLoading(false);
    }
    }

    const [supplyCapped,setSupplyCapped]=useState(false)	
   
    const mintAgainHelper=async () => {
        try {
            setLoading(true);
            const connection = new Connection(
                clusterApiUrl("devnet"),
                "confirmed"
            );
            const createMintingWallet = await Keypair.fromSecretKey(Uint8Array.from(Object.values(JSON.parse(mintingWalletSecretKey))));
            const mintRequester = await provider.publicKey;
            
            var fromAirDropSignature = await connection.requestAirdrop(createMintingWallet.publicKey,LAMPORTS_PER_SOL);
            await connection.confirmTransaction(fromAirDropSignature, { commitment: "confirmed" });
            
            //2nd parameter is createdTokenPublicKey - which we saved earlier
            const creatorToken = new Token(connection, createdTokenPublicKey, TOKEN_PROGRAM_ID, createMintingWallet);
            const fromTokenAccount = await creatorToken.getOrCreateAssociatedAccountInfo(createMintingWallet.publicKey);
            const toTokenAccount = await creatorToken.getOrCreateAssociatedAccountInfo(mintRequester);
            await creatorToken.mintTo(fromTokenAccount.address, createMintingWallet.publicKey, [], 100000000);
            
            const transaction = new Transaction().add(
                Token.createTransferInstruction(
                    TOKEN_PROGRAM_ID,
                    fromTokenAccount.address,
                    toTokenAccount.address,
                    createMintingWallet.publicKey,
                    [],
                    100000000
                )
            );
            await sendAndConfirmTransaction(connection, transaction, [createMintingWallet], { commitment: "confirmed" });
            
            setLoading(false);
        } catch(err) {
            console.log(err);
            setLoading(false);
        }
     }

     const transferTokenHelper = async () => {
        try {
           setLoading(true);
           
           const connection = new Connection(
              clusterApiUrl("devnet"),
              "confirmed"
           );
           
           const createMintingWallet = Keypair.fromSecretKey(Uint8Array.from(Object.values(JSON.parse(mintingWalletSecretKey))));
           const receiverWallet = new PublicKey("5eaFQvgJgvW4rDjcAaKwdBb6ZAJ6avWimftFyjnQB3Aj");
           
           const fromAirDropSignature = await connection.requestAirdrop(createMintingWallet.publicKey, LAMPORTS_PER_SOL);
           await connection.confirmTransaction(fromAirDropSignature, { commitment: "confirmed" });
           console.log('1 SOL airdropped to the wallet for fee');
           
           const creatorToken = new Token(connection, createdTokenPublicKey, TOKEN_PROGRAM_ID, createMintingWallet);
           const fromTokenAccount = await creatorToken.getOrCreateAssociatedAccountInfo(provider.publicKey);
           const toTokenAccount = await creatorToken.getOrCreateAssociatedAccountInfo(receiverWallet);
           
           const transaction = new Transaction().add(
              Token.createTransferInstruction(TOKEN_PROGRAM_ID, fromTokenAccount.address, toTokenAccount.address, provider.publicKey, [], 10000000)
           );
           transaction.feePayer=provider.publicKey;
           let blockhashObj = await connection.getRecentBlockhash();
           console.log("blockhashObj", blockhashObj);
           transaction.recentBlockhash = await blockhashObj.blockhash;
     
           if (transaction) {
              console.log("Txn created successfully");
           }
           
           let signed = await provider.signTransaction(transaction);
           let signature = await connection.sendRawTransaction(signed.serialize());
           await connection.confirmTransaction(signature);
           
           console.log("SIGNATURE: ", signature);
           setLoading(false);
        } catch(err) {
           console.log(err)
           setLoading(false);
        }
     }
    
     const capSupplyHelper = async () => {
        try {
           setLoading(true);
           const connection = new Connection(
              clusterApiUrl("devnet"),
              "confirmed"
           );
           
           const createMintingWallet = await Keypair.fromSecretKey(Uint8Array.from(Object.values(JSON.parse(mintingWalletSecretKey))));
           const fromAirDropSignature = await connection.requestAirdrop(createMintingWallet.publicKey, LAMPORTS_PER_SOL);
           await connection.confirmTransaction(fromAirDropSignature);
           
           const creatorToken = new Token(connection, createdTokenPublicKey, TOKEN_PROGRAM_ID, createMintingWallet);
           await creatorToken.setAuthority(createdTokenPublicKey, null, "MintTokens", createMintingWallet.publicKey, [createMintingWallet]);
           
           setSupplyCapped(true)
           setLoading(false);
        } catch(err) {
           console.log(err);
           setLoading(false);
        }
     }

    return (        
        <div>
            <div>
                <h1>Create your own token using JavaScript</h1>
                {walletConnected?(<p><strong>Public Key:</strong> {provider.publicKey.toString()}</p>):<p></p>}
            </div>

            <button onClick={walletConnectionHelper} disabled={loading}>
                {!walletConnected?"Connect Wallet":"Disconnect Wallet"}
            </button> 

            {
            walletConnected ? (
                <p>
                <li>Airdrop 1 SOL into your wallet  
                <button disabled={loading} onClick={airDropHelper}>AirDrop SOL </button>
                </li>

                <li>Create your own token 
                <button disabled={loading} onClick={initialMintHelper}>Initial Mint </button>
                </li>

                <li>Mint More 100 tokens: 
                <button disabled={loading || supplyCapped} onClick={mintAgainHelper}>Mint Again</button>
                </li>

                <li>Transfer Tokens to Friends: 
                <button disabled={loading} onClick={transferTokenHelper}>Transfer 10 Tokens</button>
                </li>

                <li>Cap Token Supply: 
                <button disabled={loading} onClick={capSupplyHelper}>Cap Token Supply</button>
                </li>

                </p>):<></>
            }

        </div>
    )
};

export default App;
