export interface IRegisterMember {
  name: string;
  email: string;
  password: string;
  image?: string;
}

export interface ILoginUser {
  email: string;
  password: string;
}
