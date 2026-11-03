import * as path from 'path';

import cookieParser from 'cookie-parser';
import express, { json, static as serveStatic, urlencoded } from 'express';
import { glob } from 'glob';
import favicon from 'serve-favicon';

import { ApiError } from './api/tasks-client';
import { Nunjucks } from './modules/nunjucks';

const { setupDev } = require('./development');

const env = process.env.NODE_ENV || 'development';
const developmentMode = env === 'development';

export const app = express();
app.disable('x-powered-by');
app.locals.ENV = env;

new Nunjucks(developmentMode).enableFor(app);

app.use(favicon(path.join(__dirname, '/public/assets/images/favicon.ico')));
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(cookieParser());
app.use(serveStatic(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate, no-store');
  next();
});

glob
  .sync(__dirname + '/routes/**/*.+(ts|js)')
  .map(filename => require(filename))
  .forEach(route => route.default(app));

setupDev(app, developmentMode);

app.use((req, res) => {
  res.status(404).render('not-found');
});

// Express recognises an error handler by its four parameters, so `next` must stay even though it is unused.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof ApiError && err.status === 404) {
    res.status(404).render('not-found');
    return;
  }
  // eslint-disable-next-line no-console -- unexpected errors are logged server-side, never shown to users
  console.error(err);
  res.status(500).render('error');
});
