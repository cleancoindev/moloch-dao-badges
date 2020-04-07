import React, { useContext } from "react";
import { Button } from "rebass";

import { Web3ModalContext, CurrentUserContext } from "../../contexts/Store";
import { createWeb3User, w3connect } from "../../utils/Auth";

export const Web3SignIn = () => {
  const [web3Modal, setWeb3Modal] = useContext(Web3ModalContext);
  const [, setCurrentUser] = useContext(CurrentUserContext);

  return (
    <Button
      variant="outline-primary"
      ml={5}
      onClick={async () => {
        try {
          const w3c = await w3connect(web3Modal);
          const [account] = await w3c.web3.eth.getAccounts();
          setWeb3Modal(w3c);
          const user = createWeb3User(account);
          setCurrentUser(user);
        } catch (err) {
          console.log("web3Modal error", err);
        }
      }}
    >
      Sign In With Web3
    </Button>
  );
};
