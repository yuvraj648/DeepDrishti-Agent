import torch
import torch.nn as nn

class GeneratorSmall(nn.Module):
    def __init__(self):
        super().__init__()

        def down(in_c, out_c, norm=True):
            layers = [nn.Conv2d(in_c, out_c, 4, 2, 1)]
            if norm:
                layers.append(nn.BatchNorm2d(out_c))
            layers.append(nn.LeakyReLU(0.2))
            return nn.Sequential(*layers)

        def up(in_c, out_c):
            return nn.Sequential(
                nn.ConvTranspose2d(in_c, out_c, 4, 2, 1),
                nn.BatchNorm2d(out_c),
                nn.ReLU()
            )

        self.d1 = down(3, 64, False)
        self.d2 = down(64, 128)
        self.d3 = down(128, 256)

        self.u1 = up(256, 128)
        self.u2 = up(256, 64)

        self.final = nn.ConvTranspose2d(128, 3, 4, 2, 1)

    def forward(self, x):
        d1 = self.d1(x)
        d2 = self.d2(d1)
        d3 = self.d3(d2)

        u1 = self.u1(d3)
        u2 = self.u2(torch.cat([u1, d2], 1))

        return torch.tanh(self.final(torch.cat([u2, d1], 1)))
