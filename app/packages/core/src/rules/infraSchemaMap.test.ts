import { describe, it, expect } from 'vitest';
import { addressToDisplayName } from './infraSchemaMap';
import { parseTerraformToSchema } from './terraformImport';

describe('addressToDisplayName', () => {
  it('formats Terraform addresses as hyphenated-type.local-name', () => {
    expect(addressToDisplayName('aws_cloudfront_distribution.this')).toBe(
      'aws-cloudfront-distribution.this'
    );
    expect(addressToDisplayName('aws_lambda_function.api')).toBe('aws-lambda-function.api');
    expect(addressToDisplayName('data.aws_ami.ubuntu')).toBe('data.aws-ami.ubuntu');
    expect(addressToDisplayName('module.vpc')).toBe('module.vpc');
  });
});

describe('infraIrToSchema display names', () => {
  it('uses the Terraform address as the node name', () => {
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
      'aws-lambda-function.this',
      'aws-s3-bucket.this',
      'aws-security-group.this',
      'aws-vpc.main',
    ]);
  });
});
