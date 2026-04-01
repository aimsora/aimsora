import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  from
} from "@apollo/client/core";
import { setContext } from "@apollo/client/link/context";

const endpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT ?? "/graphql";

const httpLink = new HttpLink({
  uri: endpoint,
  fetch
});

const authLink = setContext((_, { headers }) => {
  const accessToken = localStorage.getItem("aimsora.accessToken");
  return {
    headers: {
      ...headers,
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
    }
  };
});

export const apolloClient = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache()
});
