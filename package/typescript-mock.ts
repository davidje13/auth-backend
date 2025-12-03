import { buildMockSSO } from 'authentication-backend/mock';

buildMockSSO().listen(9000);
buildMockSSO({ iss: 'me' }).listen(9000);

//@ts-expect-error
buildMockSSO(0);
