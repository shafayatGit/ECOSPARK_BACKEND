import app from "./app";
import { envVars } from "./app/config/env";
import { seedAdmin } from "./app/utils/seed";

async function main() {
  try {
    await seedAdmin();
    app.listen(envVars.PORT, () => {
      console.log(`Example app listening on port ${envVars.PORT}`);
    });
  } catch (err) {
    console.log(err);
  }
}

main();
