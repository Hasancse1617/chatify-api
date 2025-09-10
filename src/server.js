import { ENV } from './config/env.js';

import server from './app.js';

server.listen(ENV.PORT, () => {
  console.log(`Server running on port ${ENV.PORT}`);
});