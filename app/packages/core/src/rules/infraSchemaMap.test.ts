import { describe, it, expect } from 'vitest';
import { parseTerraformToSchema } from './terraformImport';

describe('infraIrToSchema display names', () => {
  it('uses humanized provider type when the Terraform label is generic', () => {
    const hcl = `
resource "aws_lambda_function" "this" {
  function_name = var.api_name
}

resource "aws_s3_bucket" "this" {
  bucket = "orders-assets"
}

resource "aws_security_group" "this" {
  vpc_id = aws_vpc.main.id
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
`;
    const result = parseTerraformToSchema(hcl, {
      targetLevel: 'container',
      parentEntityRef: 'acme/platform',
    });

    expect(result.schema.nodes.map(n => n.name)).toEqual([
      'AWS Lambda Function',
      'AWS S3 Bucket',
      'AWS Security Group',
      'AWS Vpc',
    ]);
  });

  it('keeps explicit non-generic Terraform labels', () => {
    const hcl = `
resource "aws_lambda_function" "api" {
  function_name = var.api_name
}
`;
    const result = parseTerraformToSchema(hcl, {
      targetLevel: 'container',
      parentEntityRef: 'acme/platform',
    });

    expect(result.schema.nodes[0]?.name).toBe('api');
  });
});
