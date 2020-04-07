import React, { useState, useEffect, createContext } from "react";
import Web3Modal from "web3modal";
import Box from "3box";
import { w3connect, providerOptions, createWeb3User } from "../utils/Auth";
import { getChainData } from "../utils/Chains";

export const LoaderContext = createContext(false);
export const Web3ModalContext = createContext();
export const CurrentUserContext = createContext();

const Store = ({ children }) => {
  const [currentUser, setCurrentUser] = useState();
  const [loading, setLoading] = useState(false);
  const [web3Modal, setWeb3Modal] = useState(
    new Web3Modal({
      network: getChainData(+process.env.REACT_APP_CHAIN_ID).network, // optional
      providerOptions, // required
      cacheProvider: true,
    })
  );

  useEffect(() => {
    const initCurrentUser = async () => {
      let user;
      try {
        const w3c = await w3connect(web3Modal);
        const [account] = await w3c.web3.eth.getAccounts();
        setWeb3Modal(w3c);
        user = createWeb3User(account);

        set3BoxData(user);
      } catch (e) {
        console.error(`Could not log in with web3`);
      }
    };

    const set3BoxData = async (user) => {
      try {
        const profile = await Box.getProfile(user.username);
        setCurrentUser({ ...user, ...{ profile } });
      } catch (err) {
        console.log("3box err", err);
        setCurrentUser(user);
      }
    };

    if (web3Modal.cachedProvider) {
      initCurrentUser();
    }

    if (currentUser && !currentUser.profile) {
      set3BoxData(currentUser);
    }
  }, [web3Modal, currentUser]);

  return (
    <LoaderContext.Provider value={[loading, setLoading]}>
      <Web3ModalContext.Provider value={[web3Modal, setWeb3Modal]}>
        <CurrentUserContext.Provider value={[currentUser, setCurrentUser]}>
          {children}
        </CurrentUserContext.Provider>
      </Web3ModalContext.Provider>
    </LoaderContext.Provider>
  );
};

export default Store;
