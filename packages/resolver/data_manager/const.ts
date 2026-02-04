import { intentMap, intentPolicyMap } from "../types";

export const CATEGORIES = Object.keys(intentMap).filter((intent) => intent !== "auto");
export const ORDERS = Object.keys(intentPolicyMap);
export const DATA_PATH = `${__dirname}/../__data`;
