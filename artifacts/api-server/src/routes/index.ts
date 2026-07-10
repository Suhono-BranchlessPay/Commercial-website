import { Router, type IRouter } from "express";
import healthRouter from "./health";
import menuRouter from "./menu";
import ordersRouter from "./orders";
import customersRouter from "./customers";
import settingsRouter from "./settings";
import versionRouter from "./version";
import squareRouter from "./square";
import configRouter from "./config";
import deliveryRouter from "./delivery";
import placesRouter from "./places";
import webhooksRouter from "./webhooks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(menuRouter);
router.use(ordersRouter);
router.use(customersRouter);
router.use(settingsRouter);
router.use(versionRouter);
router.use(squareRouter);
router.use(configRouter);
router.use(deliveryRouter);
router.use(placesRouter);
router.use(webhooksRouter);

export default router;
