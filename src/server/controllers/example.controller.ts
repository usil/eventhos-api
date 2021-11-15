import { Request, Response } from 'express';

const exampleControllers = (routeName: string) => {
  const getWorksMessage = (req: Request, res: Response) => {
    return res.json({ message: `Route ${routeName} works` });
  };
  return { getWorksMessage };
};

export default exampleControllers;
