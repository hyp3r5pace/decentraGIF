import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import { useEffect, useState } from 'react';
import idl from './idl.json';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
// importing keypair
import kp from './keypair.json'

// SystemProgram is a reference to solana runtime
const { SystemProgram, Keypair } = web3;

// create a keypair for the account that will hold the GIF data
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

// get our program's ID from IDL file
const programID = new PublicKey(idl.metadata.address);

// set the network to devnet
const network = clusterApiUrl('devnet');

// controls how we want to acknowledge when a transaction is done
const opts = {
  preflightCommitment: "processed"
}


const App = () => {
  // state which stores the wallet address
  // helps to determine if 'connect wallet' button needs to be rendered or not
  const [walletAddress, setWalletAddress] = useState(null);
  // state to hold the data put into input element
  const [inputValue, setInputValue] = useState('');
  // state to hold the gif list to be rendered
  const [gifList, setGifList] = useState([])

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;
      if (solana) {
        // checking specifically for phantom wallet
        if (solana.isPhantom) {
          console.log("Phantom Wallet Found!")

          // if previously wallet was connected and the session has not expired, it will connect automatically
          // no need to verify yourself by inserting password in wallet
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            'Connected with public key: ',
            response.publicKey.toString()
          );
          
          // setting the wallet address to state since wallet is already connected
          setWalletAddress(response.publicKey.toString());
        } else {
          // opening phantom site on a new tab
          alert("Phantom Wallet not found!!");
          window.open("https://phantom.app/", "_blank");
        }
      } else {
        // no solana wallet found
        alert("Phantom wallet not found");
        window.open("https://phantom.app/", "_blank");
      }
    } catch (error) {
      console.log(error);
    }
  };

  // function to trigger once 'connectWallet' button is clicked
  const connectWallet = async () => {
    const { solana } = window;
    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key: ', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    } else {
      alert('Get a phantom wallet');
      window.open("https://phantom.app/", "_blank");
    }
  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("No gif link given!");
      return
    }
    // doubt why set it before
    setInputValue('');
    console.log('Gif link: ', inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey
        },
      });
      console.log("GIF succesfully sent to program", inputValue);

      // update the gifList state and get the new gif submitted on the site
      await getGifList();
    } catch (error) {
      console.log("Error sending GIF: ", error);
    }
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  // provider basically is a object which helps to provide
  // a authenticated connection to solana
  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }

  // function to create a new account to store gif
  const createGifAccount = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("Ping");
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/ address: ", baseAccount.publicKey.toString());
      await getGifList();

    } catch(error) {
      console.log("Error creating BaseAccount account: ", error);
    }
  }



  // render the button for connecting wallet to site
  const renderNotConnectedContainer = () => (
    <button
      className='cta-button connect-wallet-button'
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  // get solana explorer link for the address
  const getAddressLink = (address) => {
    return ("https://explorer.solana.com/address/" + address + "?cluster=devnet");
  };
  // function to render the list of gifs
  const renderConnectedContainer = () => {
    // If we hit this, it means the program account hasn't been initialized.
      if (gifList === null) {
        return (
          <div className="connected-container">
            <button className="cta-button submit-gif-button" onClick={createGifAccount}>
              Do One-Time Initialization For GIF Program Account
            </button>
          </div>
        )
      } 
      // Otherwise, we're good! Account exists. User can submit GIFs.
      else {
        return(
          <div className="connected-container">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendGif();
              }}
            >
              <input
                type="text"
                placeholder="Enter gif link!"
                value={inputValue}
                onChange={onInputChange}
              />
              <button type="submit" className="cta-button submit-gif-button">
                Submit
              </button>
            </form>
            <div className="gif-grid">
              {/* We use index as the key instead, also, the src is now item.gifLink */}
              {gifList.map((item, index) => (
                <div className="gif-item" key={index}>
                  <figure>
                    <img src={item.gifLink} />
                    <figcaption className="fig-item">
                      <a href={getAddressLink(item.userAddress.toString())} target="_blank">
                        {item.userAddress.toString()}
                      </a>
                    </figcaption>
                  </figure>
                </div>
              ))}
            </div>
          </div>
        )
      }
    }

  // this useeffect executes after every render
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  // fetches the gif from the solana account
  const getGifList = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
      
      console.log("Got the account", account);
      setGifList(account.gifList);
    } catch (error) {
      console.log("Error in getgifList: ", error);
      setGifList(null);
    }
  }


  // this useEffect will only be rendered when walletAddress has changed --> so only when user's wallet has connected
  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching gif list...');
      // will write some solana frontend code to fetch gifs from chain
      getGifList();
    }
  }, [walletAddress]);

  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">🖼 GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
      </div>
    </div>
  );
};

export default App;
