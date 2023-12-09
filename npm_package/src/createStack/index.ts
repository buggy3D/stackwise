import { BoilerplateMetadata } from '../../../shared/integrations/lib/types';
import generateFunction from '../../../shared/integrations/generic/generateFunction';
import createStackFile from '../createStackFile/index';
import createComponent from '../createComponent/index';
import {
  combineSkeleton,
  getFunctionName,
} from '../skeleton/buildSkeleton/index';
import createBoilerplateEmbedding from '../../../shared/createEmbedding/boilerplateEmbedding';

export default async function createStack(
  ioData: Record<string, unknown>,
  brief: string,
  functionId: string,
  briefSkeleton: string,
  functionAndOutputSkeleton: string,
  nearestBoilerplate: BoilerplateMetadata | BoilerplateMetadata[],
  integration: string,
  embedding: number[]
) {
  console.log(`NO exact match for the functionId ${functionId}`);
  // generate a function from the default values
  let generatedFunction = await generateFunction(
    briefSkeleton,
    functionAndOutputSkeleton,
    brief,
    nearestBoilerplate,
    integration,
    embedding
  );

  // match IO data here (trigger html adjustment)
  // extract methodName
  const methodName = getFunctionName(generatedFunction);

  generatedFunction = combineSkeleton(briefSkeleton, generatedFunction);

  await createComponent(ioData);

  await createBoilerplateEmbedding(
    brief,
    ioData.input,
    ioData.output,
    integration,
    functionId,
    generatedFunction,
    methodName,
    combineSkeleton(briefSkeleton, functionAndOutputSkeleton),
    'boilerplate_1'
  );

  createStackFile(generatedFunction);
}
