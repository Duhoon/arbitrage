export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  DATABASE_PASSSWORD: process.env.DATABASE_PASSWORD,
  DATABASE_USERNAME: process.env.DATABASE_USERNAME,
  DATABASE_PORT: Number(process.env.DATABASE_PORT) || 3306,
  DATABASE_HOST: process.env.DATABASE_HOST,
  DATABASE_NAME: process.env.DATABASE_NAME,
});
