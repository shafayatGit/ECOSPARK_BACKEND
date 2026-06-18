import { envVars } from "./env";
import Stripe from "stripe";

export const stripe = new Stripe(envVars.STRIPE_SECRET_KEY);
