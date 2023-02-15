export enum QuestionType {
    Url = 'url',
    Client = 'client',
    Credentials = 'credentials',
    Connection = 'connection',
    Username = 'username',
    Password = 'password'
}

export type QuestionTypes = {
    [QuestionType.Url]: string;
    [QuestionType.Client]?: string | undefined;
    [QuestionType.Credentials]?: { username: string; password: string };
};
