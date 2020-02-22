# version-docs
Do you have auto-generated docs that you would like to host? Are you annoyed by large PR's and commit diffs because your auto-generated docs are too big? "version-docs" will let you generate docs on CI rather than committing them while still being able to store them within your git repo. 

## Example
https://github.com/bobrown101/version-docs-example-app
https://bobrown101.github.io/version-docs-example-app/

## How does it work
"version-docs" keeps all of your docs versioned by git commit hashes in a single branch allowing you to easily deploy them as static assets to a hosting provider. 
If you want an easy way to deploy your docs branch, github pages is by far the easiest way to go, just set 'doc-branch: gh-pages'. If for some reason you cannot use github pages, check out https://github.com/bobrown101/deploy-branch. It performs similarly to github pages, however it deploys to a third party hosting provider such as netlfiy.

If you make a commit on a branch named "feature1" with a commit hash of "1234", doc-location set to `docs` and `doc-branch` set to `gh-pages`, "version-docs" will add a commit on the git branch `gh-pages` with the contents:
```
feature1/
    latest/
        docs/
            ...docs for "1234" located here
    1234/
        docs/
            ...docs for "1234" located here
```


## Setup
- `doc-location` represents the folder your auto-generated docs will be located at.
    For example if you ran `typedoc --out docsFoldername` on CI, your `doc-location` would be "docsFoldername"
- `doc-branch` represents what git branch your docs will live at.
    Common doc branches are named `gh-pages`, `docs` or `documentation`
```
- name: Version docs
  uses: bobrown101/version-docs@v2.0.8
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    doc-location: docs
    doc-branch: docs
```
