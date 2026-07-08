import { Router, type IRouter } from "express";
import healthRouter from "./health";
import menuRouter from "./menu";
import ordersRouter from "./orders";
import customersRouter from "./customers";
import settingsRouter from "./settings";
import versionRouter from "./version";

const router: IRouter = Router();

router.use(healthRouter);
router.use(menuRouter);
router.use(ordersRouter);
router.use(customersRouter);
router.use(settingsRouter);
router.use(versionRouter);

export default router;
