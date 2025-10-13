# Contributor Guide

## Dev Environment Tips
- Use `npm install` to install all of the dependencies for the project.
- The deps are installed into the local `node_modules` folder.
- Any new component(s) must leverage the stack: Tanstack Query, zustand, motion.dev, zod, and Chackra UI. Corresponding documentation for each tool in the stack is available in `llms/*.md`, where * is the name of the tool (i.e. `llms/motion.dev.md` - the tool is `motion.dev`).
- The tools should only be used if appropriate for the task, such as a zod schema for formfield validations or Tanstack Query if an API fetch is needed.
- The use of typescript to define new components is highly encouraged, such as if defining a table component in a separate file (to be imported and used multiple times).
- API documentation of all backend endpoints is provided inside `llms/swagger.json`. The backend server is a FastAPI application serving RESTful APIs. The JSON is an openapi dump of the endpoint definitions.
- Any new page or major component should be accompanied with an addition to tests for testing coverage. 80%+ test coverage is encouraged.
- All code should follow the formatting guidelines set forth in `.prettierrc`.

## Testing Instructions
- Make sure to install the dependencies by running `npm install` before executing tests.
- After testing has completed, some logs or output should be included in any commits to serve as evidence that tests were executed and succeeded.

## PR instructions
- Title format: [<project_name>] <Title>
- If possible, try to include some logs or output from test execution in the PR, to demonstrate successful test execution.
