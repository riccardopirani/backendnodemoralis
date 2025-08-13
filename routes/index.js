import express from "express";
import walletRoutes from "./wallets.js";
import nftRoutes from "./nfts.js";
import collectionRoutes from "./collections.js";
import cvRoutes from "./cv.js";
import veriffRoutes from "./veriff.js";

const router = express.Router();

router.use("/wallet", walletRoutes);
router.use("/nft", nftRoutes);
router.use("/collection", collectionRoutes);
router.use("/cv", cvRoutes);
router.use("/veriff", veriffRoutes);

export default router;
