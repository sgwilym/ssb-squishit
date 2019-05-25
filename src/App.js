import React from "react";
import ApolloClient from "apollo-boost";
import { gql } from "apollo-boost";
import { ApolloProvider, Query } from "react-apollo";
import { ForceGraph3D } from "react-force-graph";

const client = new ApolloClient({
  uri: "http://localhost:8080/graphql"
});

const authorFollowsAndFollowedIDs = author => [
  author.id,
  ...author.follows.map(({ id }) => id),
  ...author.followedBy.map(({ id }) => id)
];

const makeNodes = author => {
  const followsNodes = author.follows ? author.follows.map(makeNodes) : [];
  const followedNodes = author.followedBy
    ? author.followedBy.map(makeNodes)
    : [];

  const nodes = [author, ...followsNodes, ...followedNodes].flat(2);

  return Array.from(new Set(nodes.map(node => node.id))).map(id => ({
    id,
    ...nodes.find(node => node.id === id)
  }));
};

const makeLinks = author => {
  const followsLinks = author.follows
    ? author.follows.map(followAuthor => ({
        source: followAuthor.id,
        target: author.id
      }))
    : [];

  const followedLinks = author.followedBy
    ? author.followedBy.map(followerAuthor => ({
        source: author.id,
        target: followerAuthor.id
      }))
    : [];

  const authorLinks = [...followsLinks, ...followedLinks];

  const linksOfFollowers = author.followedBy
    ? author.followedBy.map(makeLinks)
    : [];
  const linksOfFollowed = author.follows ? author.follows.map(makeLinks) : [];

  return [...authorLinks, ...linksOfFollowers, ...linksOfFollowed]
    .flat(2)
    .filter((link, i, arr) => arr.indexOf(link) === i);
};

const prepareForGraph = data => ({
  nodes: makeNodes(data.currentAuthor).filter(({ id }) =>
    authorFollowsAndFollowedIDs(data.currentAuthor).includes(id)
  ),
  links: makeLinks(data.currentAuthor).filter(
    ({ source, target }) =>
      authorFollowsAndFollowedIDs(data.currentAuthor).includes(source) &&
      authorFollowsAndFollowedIDs(data.currentAuthor).includes(target)
  )
});

function App() {
  return (
    <ApolloProvider client={client}>
      <Query
        query={gql`
          {
            currentAuthor {
              ...AuthorDetails
              follows {
                ...AuthorDetails
                follows {
                  ...AuthorDetails
                }
                followedBy {
                  ...AuthorDetails
                }
              }
              followedBy {
                ...AuthorDetails
                follows {
                  ...AuthorDetails
                }
                followedBy {
                  ...AuthorDetails
                }
              }
            }
          }
          fragment AuthorDetails on Author {
            id
            name
          }
        `}
      >
        {({ loading, error, data }) => {
          if (loading) return <p>Loading…</p>;
          if (error) return <p>Error!</p>;

          return (
            <ForceGraph3D
              graphData={prepareForGraph(data)}
              linkDirectionalParticles={3}
              linkDirectionalParticleWidth={1}
              nodeAutoColorBy={d => d.id}
              linkAutoColorBy={d => d.source}
            />
          );
        }}
      </Query>
    </ApolloProvider>
  );
}

export default App;
