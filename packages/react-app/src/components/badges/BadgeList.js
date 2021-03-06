import React, { useEffect, useContext, useState } from "react";
import { useQuery } from "@apollo/react-hooks";
import { Flex, Box as ReBox } from "rebass";
import Box from "3box";

import { GET_BADGES } from "../../utils/Queries";
import { hydrateBadgeData, getLog } from "../../utils/Helpers";
import BadgeRegistry from "../../assets/data/badges.json";
import BadgeItem from "./BadgeItem";
import { Web3ModalContext, CurrentUserContext } from "../../contexts/Store";
import addresses from "../../contracts/addresses";
import abi from "../../contracts/badgeNFT.json";

const BadgeList = ({ playerAddr, isOwner }) => {
  const [web3Modal] = useContext(Web3ModalContext);
  const [currentUser] = useContext(CurrentUserContext);

  const [badges, setBadges] = React.useState([]);
  const [txloading, setTxloading] = useState(false);
  const [contract, setContract] = useState();
  const [events, setEvents] = useState();
  const [playerNFTs, setPlayerNFTs] = useState([]);

  const { loading, error, data } = useQuery(GET_BADGES, {
    variables: {
      addr: `${playerAddr}`,
    },
  });

  // get mint log events for player and nft contract
  useEffect(() => {
    const asyncGetLogs = async () => {
      const contractAddr =
        +process.env.REACT_APP_CHAIN_ID === 42
          ? addresses.badgeNFT.kovan
          : addresses.badgeNFT.mainnet;
      const nftContract = new web3Modal.web3.eth.Contract(abi, contractAddr);
      setContract(nftContract);
      const events = await getLog(nftContract, playerAddr);
      setEvents(events);
    };
    if (web3Modal.web3) {
      asyncGetLogs();
    }
  }, [web3Modal.web3, playerAddr]);

  // get token deatils (uri) for each token.
  useEffect(() => {
    const getDetails = async () => {
      const promises = [];

      events.forEach((ev) => {
        const prom = contract.methods.tokenURI(ev.returnValues.tokenId).call();
        promises.push(prom);
      });
      const tokenURIs = await Promise.all(promises);
      setPlayerNFTs(
        tokenURIs.map((uri) =>
          uri.split("/")[uri.split("/").length - 1].split("-")
        )
      );
    };
    if (events && events.length) {
      getDetails();
    }
  }, [events, contract]);

  // hydrate data for badge item
  useEffect(() => {
    if (!loading && !error && data && playerNFTs) {
      const hydratedBadgeData = hydrateBadgeData(
        BadgeRegistry,
        data.badges,
        playerNFTs
      );
      setBadges(hydratedBadgeData);
    }
  }, [loading, error, data, playerNFTs]);

  const mintNFT = async (badgeHash) => {
    setTxloading(true);
    try {
      const txReceipt = await contract.methods
        .awardBadge(
          playerAddr,
          "https://gateway.pinata.cloud/ipfs/" + badgeHash
        )
        .send({ from: playerAddr });
      console.log("txReceipt", txReceipt);
      const tokenId = txReceipt.events.Transfer.returnValues.tokenId;
      try {
        const box = await Box.openBox(currentUser.username, window.ethereum);
        currentUser.profile.collectiblesFavorites.push({
          address: addresses.badgeNFT,
          token_id: tokenId,
        });
        await box.public.set(
          "collectiblesFavorites",
          currentUser.profile.collectiblesFavorites
        );
      } catch (err) {
        console.log("3box error:", err);
      }
    } catch {
      console.log("rejected");
    } finally {
      await getEventsFromLog();
      setTxloading(false);
      return true;
    }
  };

  const getEventsFromLog = async () => {
    const contractAddr =
      +process.env.REACT_APP_CHAIN_ID === 42
        ? addresses.badgeNFT.kovan
        : addresses.badgeNFT.mainnet;
    const nftContract = new web3Modal.web3.eth.Contract(abi, contractAddr);
    setContract(nftContract);
    const events = await getLog(nftContract, playerAddr);
    setEvents(events);
  };

  const renderBadges = () => {
    return badges.map((badge, idx) => {
      return (
        <ReBox mb={5} key={idx}>
          <h3>{badge.title}</h3>
          <p>{`${badge.userCount} ${badge.description}`}</p>
          <Flex p={2}>{renderBadgeItems(badge)}</Flex>
        </ReBox>
      );
    });
  };

  const renderBadgeItems = (badge) => {
    return badge.thresholds.map((step, idx) => {
      return (
        <BadgeItem
          mintNFT={mintNFT}
          badge={badge}
          step={step}
          idx={idx}
          key={idx}
          isOwner={isOwner}
        />
      );
    });
  };

  return (
    <div>
      {(loading || txloading) && <p>loading...</p>}
      {badges.length && renderBadges()}
    </div>
  );
};

export default BadgeList;
